import * as core from '@actions/core'
import {env} from 'process'
import {generateMessage, notify} from './lark'

async function run(): Promise<void> {
    try {
        const tagName = env.INPUT_TAG_NAME?.trim()
        const draft = env.INPUT_DRAFT ? env.INPUT_DRAFT === 'true' : undefined
        const ref = env.GITHUB_REF || ''
        if (!tagName || draft || !ref.startsWith('refs/tags/')) {
            throw new Error('lark-release-notify require a tag')
        }

        const status = core.getInput('status')
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

        await notify(webhook, message)
    } catch (error) {
        if (error instanceof Error) core.setFailed(error.message)
    }
}

run()
