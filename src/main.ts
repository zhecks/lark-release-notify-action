import * as core from '@actions/core'
import {context} from '@actions/github'
import {generateMessage, notify} from './lark'

async function run(): Promise<void> {
    try {
        const ref = context.ref
        if (!ref.startsWith('refs/tags/')) {
            throw new Error('lark-release-notify require a tag')
        }
        const tagName = ref.replace('refs/tags/', '')
        // release on all os is success
        let status = core.getInput('status')
        if (status === '') {
            status = 'success'
        }
        core.info(`the release actions status is ${status}`)

        const templateID = core.getInput('template_id')
        const notificationTitle = core.getInput('notification_title')
        const users = core.getInput('users')
        const webhook = core.getInput('webhook')
        const secret = core.getInput('secret')

        const message = generateMessage(
            templateID,
            notificationTitle,
            tagName,
            users,
            status,
            secret
        )

        core.info('send notification to lark')
        await notify(webhook, message)
        core.info('finalize')
    } catch (error) {
        if (error instanceof Error) core.setFailed(error.message)
    }
}

run()
