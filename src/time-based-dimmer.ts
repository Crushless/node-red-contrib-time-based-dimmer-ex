// eslint-disable-next-line import/no-unresolved, no-unused-vars
import { Red, Node } from 'node-red'
// eslint-disable-next-line no-unused-vars
import { fixBrokenConfig, TimeBasedDimmerConfig } from './time-based-dimmer-config'

interface TwoButtonDimmerConfig extends TimeBasedDimmerConfig {
    startIncCommand: string
    startDecCommand: string
    stopIncCommand: string
    stopDecCommand: string
}

module.exports = (red: Red): void => {
    function tick(send: Function, node: Node, config: TwoButtonDimmerConfig) {
        let newValue: number
        const oldValue = node.context().get('value') || 0
        if (node.context().get('mode') === 'inc') {
            newValue = oldValue + config.step
            if (newValue > config.maxValue) {
                clearInterval(node.context().get('timer'))
                node.context().set('timer', null)
                newValue = config.maxValue
            }
        } else {
            newValue = oldValue - config.step
            if (newValue < config.minValue) {
                clearInterval(node.context().get('timer'))
                node.context().set('timer', null)
                newValue = config.minValue
            }
        }
        if (node.context().get('value') === newValue) return
        node.status({ fill: 'grey', shape: 'dot', text: newValue.toString() })
        node.context().set('value', newValue)
        send({ payload: newValue })
    }

    class TimeBasedDimmerNode {
        constructor(config: TwoButtonDimmerConfig) {
            fixBrokenConfig(config)

            red.nodes.createNode(this as any, config)
            const node: Node = this as any

            let regExpStartIncCommand: RegExp
            let regExpStartDecCommand: RegExp
            let regExpStopIncCommand: RegExp
            let regExpStopDecCommand: RegExp

            // Precompile RegExp matchers
            try {
                regExpStartIncCommand = new RegExp(config.startIncCommand)
            } catch (error) {
                node.error(`invalid Start Increase Command RegExp: ${error}`)
                return
            }
            try {
                regExpStartDecCommand = new RegExp(config.startDecCommand)
            } catch (error) {
                node.error(`invalid Start Decrease Command RegExp: ${error}`)
                return
            }
            try {
                regExpStopIncCommand = new RegExp(config.stopIncCommand)
            } catch (error) {
                node.error(`invalid Stop Increase Command RegExp: ${error}`)
                return
            }
            try {
                regExpStopDecCommand = new RegExp(config.stopDecCommand)
            } catch (error) {
                node.error(`invalid Stop Decrease Command RegExp: ${error}`)
                return
            }

            node.on('input', (msg: any, send: Function, done: Function) => {
                switch (typeof msg.payload) {
                    case 'number':
                        node.status({ fill: 'grey', shape: 'dot', text: msg.payload.toString() })
                        node.context().set('value', msg.payload)
                        send(msg)
                        break
                    case 'string':
                        let timer = node.context().get('timer')
                        let payload = String(msg.payload)
                        if (regExpStartIncCommand.test(payload)) {
                            if (!timer) {
                                node.context().set('mode', 'inc')
                                node.context().set(
                                    'timer',
                                    setInterval(() => tick(send, node, config), config.interval)
                                )
                            }
                        } else if (regExpStartDecCommand.test(payload)) {
                            if (!timer) {
                                node.context().set('mode', 'dec')
                                node.context().set(
                                    'timer',
                                    setInterval(() => tick(send, node, config), config.interval)
                                )
                            }
                        } else if (regExpStopIncCommand.test(payload) || regExpStopDecCommand.test(payload)) {
                            if (timer) {
                                clearInterval(timer)
                                node.context().set('timer', null)
                            }
                        } else {
                            node.log(`missing command "${payload}"`)
                        }
                        break
                    default:
                    // do nothing
                }
                if (done) {
                    done()
                }
            })
        }
    }

    red.nodes.registerType('time-based-dimmer', TimeBasedDimmerNode as any)
}
