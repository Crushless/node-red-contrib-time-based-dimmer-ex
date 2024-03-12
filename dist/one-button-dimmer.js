"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var MODE_INC = 'inc';
var MODE_DEC = 'dec';
module.exports = function (red) {
    function tick(send, node, config) {
        var newValue;
        var oldValue = node.context().get('value') || 0;
        if (typeof oldValue === 'string') {
            oldValue = Number.parseInt(oldValue, 10);
        }
        if (node.context().get('mode') === MODE_INC) {
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
            if (typeof config.step === 'string') {
                config.step = Number.parseInt(config.step, 10);
            }
            red.nodes.createNode(this, config);
            var node = this;
            var regExpStartCommand;
            var regExpStopCommand;
            try {
                regExpStartCommand = new RegExp(config.startCommand);
            }
            catch (error) {
                node.error("invalid Start Command RegExp: " + error);
            }
            try {
                regExpStopCommand = new RegExp(config.stopCommand);
            }
            catch (error) {
                node.error("invalid Stop Command RegExp: " + error);
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
                        if (regExpStartCommand.test(payload)) {
                            if (!timer) {
                                var currentMode = node.context().get('mode');
                                node.context().set('mode', currentMode === MODE_INC ? MODE_DEC : MODE_INC);
                                node.context().set('timer', setInterval(function () { return tick(send, node, config); }, config.interval));
                            }
                        }
                        else if (regExpStopCommand.test(payload)) {
                            if (timer) {
                                clearInterval(timer);
                                node.context().set('timer', null);
                            }
                        }
                        else {
                            node.log("missing command \"" + msg.payload + "\"");
                        }
                        break;
                    case 'object':
                        var next = msg.payload.next;
                        if (typeof next === 'string') {
                            next = next.toLowerCase();
                            node.context().set('mode', next === MODE_INC ? MODE_DEC : MODE_INC);
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
    red.nodes.registerType('one-button-dimmer', TimeBasedDimmerNode);
};
