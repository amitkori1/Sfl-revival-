const commands = [];

function addCommand(options, handler) {
    commands.push({ options, handler });
}

function getCommands() {
    return commands;
}

module.exports = { addCommand, getCommands };
