function isIdentifierCharacter(c) {
    return /^[A-Za-z]$/.test(c);
};


function renderText(name) {
    const element = document.createElement('span');
    element.innerText = name;
    return element;
};

EXPRESSION.renderedHtml = function () {
    let {cached_html} = this;
    if (!cached_html) {
        cached_html = this.cached_html = this.renderHtml();
    }
    return cached_html;
};

EXPRESSION.renderHtml = function () {
    return renderText('...');
};

REFERENCE.renderHtml = function () { 
    const {name} = this;
    return renderText(name || '<id>');
};

LAMBDA.renderHtml = function () {
    const {parameter, body} = this;
    const element = document.createElement('span');
    element.appendChild(renderText('λ'));
    element.appendChild(parameter.renderedHtml());
    element.appendChild(renderText('. '));
    element.appendChild(body.renderedHtml());
    return element;
};

APPLICATION.renderHtml = function () {
    const {operator, argument} = this;
    const element = document.createElement('span');
    element.appendChild(renderText('('));
    element.appendChild(operator.renderedHtml());
    element.appendChild(renderText(' '));
    element.appendChild(argument.renderedHtml());
    element.appendChild(renderText(')'));
    return element;
};


EXPRESSION.getRange = function () {
    const html = this.renderedHtml();
    const range = document.createRange();
    range.setStartBefore(html.firstChild);
    range.setEndAfter(html.firstChild);
    return range;
};

REFERENCE.getRange = function () {
    const html = this.renderedHtml();
    const text = html.firstChild || html;
    const {name, cursor} = this;
    const range = document.createRange();
    if (name.length === 0 || cursor === -1) {
        range.selectNode(text);
    } else {
        range.setEnd(text, cursor);
        range.setStart(text, cursor);
    }
    return range;
};

LAMBDA.getRange = function () {
    const {cursor, parameter, body} = this;
    if (cursor === -1) {
        const html = this.renderedHtml();
        const range = document.createRange();
        range.selectNode(html);
        return range;
    } else if (cursor === 0) {
        return parameter.getRange();
    } else if (cursor === 1) {
        return body.getRange();
    }
};

APPLICATION.getRange = function () {
    const {cursor, operator, argument} = this;
    if (cursor === -1) {
        const html = this.renderedHtml();
        const range = document.createRange();
        range.selectNode(html);
        return range;
    } else if (cursor === 0) {
        return operator.getRange();
    } else if (cursor === 1) {
        return argument.getRange();
    }
};


EXPRESSION.receiveKey = function (event) {
    const {key} = event;
    if (key === '(') {
        const operator = EXPRESSION.empty();
        const argument = EXPRESSION.empty();
        const application = APPLICATION.new(operator, argument);
        application.cursor = 0;
        return [true, application];
    } else if (key === '\\') {
        const parameter = REFERENCE.new('');
        parameter.cursor = 0;
        const body = EXPRESSION.empty();
        const lambda = LAMBDA.new(parameter, body);
        lambda.cursor = 0;
        return [true, lambda];
    } else if (isIdentifierCharacter(key)) {
        const reference = REFERENCE.new('');
        reference.cursor = 0;
        const [done, newReference] = reference.receiveKey(event);
        return [done, newReference];
    } else {
        return [false, this];
    }
};

REFERENCE.receiveKey = function (event) {
    const {key} = event;
    const {name, cursor} = this;
    if (key === 'Backspace') {
        if (cursor === 0 && name.length > 0) {
            return [true, this];
        } else if (cursor === -1 || cursor === 0 && name.length === 0) {
            return [true, EXPRESSION.empty()];
        } else {
            const newName = name.substring(0, cursor-1) + name.substring(cursor);
            const reference = REFERENCE.new(newName);
            reference.cursor = cursor - 1;
            return [true, reference];
        }
    } else if (key === 'Delete') {
        if (cursor === name.length && name.length > 0) {
            return [true, this];
        } else if (cursor === 0 && name.length === 0) {
            return [true, EXPRESSION.empty()];
        } else {
            const newName = name.substring(0, cursor) + name.substring(cursor+1);
            const reference = REFERENCE.new(newName);
            reference.cursor = cursor;
            return [true, reference];
        }
    } else if (key === 'ArrowLeft' && cursor > 0) {
        const reference = REFERENCE.new(name);
        reference.cursor = cursor - 1;
        return [true, reference];
    } else if (key === 'ArrowRight' && cursor < name.length) {
        const reference = REFERENCE.new(name);
        reference.cursor = cursor + 1;
        return [true, reference];
    } else if (key === 'ArrowUp' && cursor !== -1) {
        const reference = REFERENCE.new(name);
        reference.cursor = -1;
        return [true, reference];
    } else if (isIdentifierCharacter(key)) {
        const newName = name.substring(0, cursor) + key + name.substring(cursor);
        const reference = REFERENCE.new(newName);
        reference.cursor = cursor + 1;
        return [true, reference];
    } else {
        return [false, this];
    }
};

LAMBDA.receiveKey = function (event) {
    const {key} = event;
    const {parameter, body, cursor} = this;
    if (cursor === -1) {
        if (key === 'Backspace') {
            return [true, EXPRESSION.empty()];
        } else if (key === 'ArrowDown') {
            const lambda = LAMBDA.new(parameter, body);
            lambda.cursor = 0;
            return [true, lambda];
        }
    } else if (cursor === 0) {
        const [done, newParameter] = parameter.receiveKey(event);
        if (done) {
            const lambda = LAMBDA.new(newParameter, body);
            lambda.cursor = 0;
            return [true, lambda];
        } else if (key === 'Tab' || key === '.' || key === 'ArrowRight') {
            const lambda = LAMBDA.new(parameter, body);
            lambda.cursor = 1;
            return [true, lambda];
        } else if (key === 'Backspace') {
            return [true, EXPRESSION.empty()];
        } else if (key === 'ArrowUp') {
            const lambda = LAMBDA.new(parameter, body);
            lambda.cursor = -1;
            return [true, lambda];
        }
    } else if (cursor === 1) {
        const [done, newBody] = body.receiveKey(event);
        if (done) {
            const lambda = LAMBDA.new(parameter, newBody);
            lambda.cursor = 1;
            return [true, lambda];
        } else if (key === 'Backspace' || key === 'ArrowLeft') {
            const lambda = LAMBDA.new(parameter, body);
            lambda.cursor = 0;
            return [true, lambda];
        } else if (key === 'ArrowUp') {
            const lambda = LAMBDA.new(parameter, body);
            lambda.cursor = -1;
            return [true, lambda];
        }
    }
    return [false, this];
};

APPLICATION.receiveKey = function (event) {
    const {key} = event;
    const {operator, argument, cursor} = this;
    if (cursor === -1) {
        if (key === 'Backspace') {
            return [true, EXPRESSION.empty()];
        } else if (key === 'ArrowDown') {
            const application = APPLICATION.new(operator, argument);
            application.cursor = 0;
            return [true, application];
        }
    } else if (cursor === 0) {
        const [done, newOperator] = operator.receiveKey(event);
        if (done) {
            const application = APPLICATION.new(newOperator, argument);
            application.cursor = 0;
            return [true, application];
        } else if (key === 'Tab' || key === ' ' || key === 'ArrowRight') {
            const application = APPLICATION.new(operator, argument);
            application.cursor = 1;
            return [true, application];
        } else if (key === 'Backspace') {
            return [true, EXPRESSION.empty()];
        } else if (key === 'ArrowUp') {
            const application = APPLICATION.new(operator, argument);
            application.cursor = -1;
            return [true, application];
        }
    } else if (cursor === 1) {
        const [done, newArgument] = argument.receiveKey(event);
        if (done) {
            const application = APPLICATION.new(operator, newArgument);
            application.cursor = 1;
            return [true, application];
        } else if (key === 'Backspace' || key === 'ArrowLeft') {
            const application = APPLICATION.new(operator, argument);
            application.cursor = 0;
            return [true, application];
        } else if (key === 'ArrowUp') {
            const application = APPLICATION.new(operator, argument);
            application.cursor = -1;
            return [true, application];
        }
    }
    return [false, this];
};


function makeEditor(editor, output) {
    let program = EXPRESSION.empty();
    let done = false;

    function setInnerElement(container, element) {
        while (container.firstChild) { container.removeChild(container.firstChild); }
        container.appendChild(element);
    }

    function renderEditor(program) {
        const programElement = program.renderedHtml();
        const outputValue = program.betaReduce(ROOT_SCOPE);
        const outputElement = outputValue.renderedHtml();
        setInnerElement(editor, programElement);
        setInnerElement(output, outputElement);

        const range = program.getRange();
        var selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    };
    function setHandler(handler) {
        editor.onkeydown = function (event) {
            console.log(event);
            [done, program] = handler(event);
            setHandler(program.receiveKey.bind(program));
            renderEditor(program);
            return false;
        };
    };
    setHandler(program.receiveKey.bind(program));
    renderEditor(program);
}