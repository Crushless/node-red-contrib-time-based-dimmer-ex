"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var time_based_dimmer_config_1 = require("./time-based-dimmer-config");
module.exports = function (red) {
    function tick(send, node, config) {
        var newValue;
        var oldValue = node.context().get('value') || 0;
        if (node.context().get('mode') === 'inc') {
            newValue = oldValue + config.step;
            if (newValue > config.maxValue) {
                clearInterval(node.context().get('timer'));
                node.context().set('timer', null);
                newValue = config.maxValue;
            }
        }
        else {
            newValue = oldValue - config.step;
            if (newValue < config.minValue) {
                clearInterval(node.context().get('timer'));
                node.context().set('timer', null);
                newValue = config.minValue;
            }
        }
        if (node.context().get('value') === newValue)
            return;
        node.status({ fill: 'grey', shape: 'dot', text: newValue.toString() });
        node.context().set('value', newValue);
        send({ payload: newValue });
    }
    var TimeBasedDimmerNode = (function () {
        function TimeBasedDimmerNode(config) {
            time_based_dimmer_config_1.fixBrokenConfig(config);
            red.nodes.createNode(this, config);
            var node = this;
            var regExpStartIncCommand;
            var regExpStartDecCommand;
            var regExpStopIncCommand;
            var regExpStopDecCommand;
            try {
                regExpStartIncCommand = new RegExp(config.startIncCommand);
            }
            catch (error) {
                node.error("invalid Start Increase Command RegExp: " + error);
                return;
            }
            try {
                regExpStartDecCommand = new RegExp(config.startDecCommand);
            }
            catch (error) {
                node.error("invalid Start Decrease Command RegExp: " + error);
                return;
            }
            try {
                regExpStopIncCommand = new RegExp(config.stopIncCommand);
            }
            catch (error) {
                node.error("invalid Stop Increase Command RegExp: " + error);
                return;
            }
            try {
                regExpStopDecCommand = new RegExp(config.stopDecCommand);
            }
            catch (error) {
                node.error("invalid Stop Decrease Command RegExp: " + error);
                return;
            }
            node.on('input', function (msg, send, done) {
                switch (typeof msg.payload) {
                    case 'number':
                        node.status({ fill: 'grey', shape: 'dot', text: msg.payload.toString() });
                        node.context().set('value', msg.payload);
                        send(msg);
                        break;
                    case 'string':
                        var timer = node.context().get('timer');
                        var payload = String(msg.payload);
                        if (regExpStartIncCommand.test(payload)) {
                            if (!timer) {
                                node.context().set('mode', 'inc');
                                node.context().set('timer', setInterval(function () { return tick(send, node, config); }, config.interval));
                            }
                        }
                        else if (regExpStartDecCommand.test(payload)) {
                            if (!timer) {
                                node.context().set('mode', 'dec');
                                node.context().set('timer', setInterval(function () { return tick(send, node, config); }, config.interval));
                            }
                        }
                        else if (regExpStopIncCommand.test(payload) || regExpStopDecCommand.test(payload)) {
                            if (timer) {
                                clearInterval(timer);
                                node.context().set('timer', null);
                            }
                        }
                        else {
                            node.log("missing command \"" + payload + "\"");
                        }
                        break;
                    default:
                }
                if (done) {
                    done();
                }
            });
        }
        return TimeBasedDimmerNode;
    }());
    red.nodes.registerType('time-based-dimmer', TimeBasedDimmerNode);
};
