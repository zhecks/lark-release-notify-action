import * as httpm from '@actions/http-client'
import {context} from '@actions/github'
import {generateSignature} from './safe'
import * as core from '@actions/core'

interface message {
    msg_type: string
    card: string
    timestamp: string
    sign: string
}

interface card {
    type: string
    data: data
}

interface data {
    template_id: string
    template_variable: template_variable
}

interface template_variable {
    notification_title: string
    content_tag_name: string
    content_user_id: string
    content_workflows_status: string
    content_workflows_status_color: string
    button_url: string
}

export function generateMessage(
    templateID: string,
    notificationTitle: string,
    contentTagName: string,
    users: string,
    status: string,
    secret: string
): message {
    let openID = ''
    const userArr = users.split(',')
    for (const user of userArr) {
        const infos = user.split('|')
        if (infos.length !== 2) {
            throw new Error('the secret users is error')
        }
        if (infos[0] === context.actor) {
            openID = infos[1]
            break
        }
    }
    // release's actor is not in users, skip notify
    if (openID === '') {
        throw new Error('no this user in secret users, skip notify')
    }

    const contentWorkflowsStatus = status.toUpperCase()
    let contentWorkflowsStatusColor
    let buttonUrl
    switch (status) {
        case 'success':
            contentWorkflowsStatusColor = 'green'
            // go to release page
            buttonUrl = `${context.payload.repository?.html_url}/releases/tag/${contentTagName}`
            break
        default:
            contentWorkflowsStatusColor = 'red'
            buttonUrl = `${context.payload.repository?.html_url}/actions/runs/${context.runId}`
    }

    const msgCard: card = {
        type: 'template',
        data: {
            template_id: templateID,
            template_variable: {
                notification_title: notificationTitle,
                content_tag_name: contentTagName,
                content_user_id: openID,
                content_workflows_status: contentWorkflowsStatus,
                content_workflows_status_color: contentWorkflowsStatusColor,
                button_url: buttonUrl
            }
        }
    }
    // generate sign
    const now = Math.floor(Date.now() / 1000).toString()
    core.info(`timestamp: ${now}`)
    const signature = generateSignature(now, secret)

    return {
        msg_type: 'interactive',
        card: JSON.stringify(msgCard),
        timestamp: now,
        sign: signature
    }
}

interface larkResponse {
    code: number
    data: object
    msg: string
}

export async function notify(webhook: string, msg: message): Promise<void> {
    const jsonStr = JSON.stringify(msg)
    const http = new httpm.HttpClient()
    const response = await http.post(webhook, jsonStr, httpm.Headers)
    if (response.message.statusCode !== httpm.HttpCodes.OK) {
        throw new Error(
            `send request to webhook error, status code is ${response.message.statusCode}`
        )
    }
    const body = await response.readBody()
    const larkResp: larkResponse = JSON.parse(body)
    if (larkResp.code !== 0) {
        throw new Error(
            `send request to webhook error, err msg is ${larkResp.msg}`
        )
    }
}
