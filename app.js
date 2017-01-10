Object.prototype.extendChild = function (child) {
    child.__proto__ = this;
    return child;
};


const ROOT_SCOPE = {
    has: function (key) { 
        return key in this;
    },
    get: function (key) {
        return this[key];
    },
    new: function (bindings) {
        return this.extendChild(bindings);
    }
};


const EXPRESSION = {
    empty: function () {
        return EXPRESSION.extendChild({});
    }
};

const REFERENCE_TYPE = Symbol('REFERENCE');
const REFERENCE = EXPRESSION.extendChild({
    type: REFERENCE_TYPE,
    new: function (name) {
        return REFERENCE.extendChild({name});
    }
});

const LAMBDA_TYPE = Symbol('LAMBDA');
const LAMBDA = EXPRESSION.extendChild({
    type: LAMBDA_TYPE,
    new: function (parameter, body) {
        return LAMBDA.extendChild({parameter, body});
    }
});

const APPLICATION_TYPE = Symbol('APPLICATION');
const APPLICATION = EXPRESSION.extendChild({
    type: APPLICATION_TYPE,
    new: function (operator, argument) {
        return APPLICATION.extendChild({operator, argument});
    }
});


EXPRESSION.betaReduce = function (env) {
    return EXPRESSION.empty();
};

REFERENCE.betaReduce = function (env) {
    const {name} = this;
    return !env.has(name)
        ? REFERENCE.new(name, true) // primitive
        : env.get(name);
};

LAMBDA.betaReduce = function (env) {
    const {parameter, body} = this;
    const argument = REFERENCE.new(parameter.name);
    const newEnv = env.new({[parameter.name]: argument});
    return LAMBDA.new(
        REFERENCE.new(parameter.name),
        body.betaReduce(newEnv)
    );
};

EXPRESSION.betaReduceApplication = function (argument, env) {
    return APPLICATION.new(this, argument, true);
};

LAMBDA.betaReduceApplication = function (argument, env) {
    const {parameter, body} = this;
    const newEnv = env.new({[parameter.name]: argument});
    return body.betaReduce(newEnv);
}

APPLICATION.betaReduce = function (env) {
    const {operator, argument} = this;
    const reducedOperator = operator.betaReduce(env);
    const reducedArgument = argument.betaReduce(env);
    return reducedOperator.betaReduceApplication(reducedArgument, env);
};