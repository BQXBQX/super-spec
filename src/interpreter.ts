import { ExpressionError } from "./index";
import type {
	BinaryExpression,
	CallExpression,
	ConditionalExpression,
	Expression,
	Identifier,
	Literal,
	MemberExpression,
	Program,
	UnaryExpression,
} from "./parser";

export type Context = Record<string, unknown>;
export type Functions = Record<string, (...args: unknown[]) => unknown>;

/**
 * InterpreterState represents the current state of interpretation
 * @property context - Variables and values available during evaluation
 * @property functions - Functions available for calling during evaluation
 */
interface InterpreterState {
	context: Context;
	functions: Functions;
}

/**
 * Creates a new interpreter state with the provided context and functions
 * @param context - Initial variable context
 * @param functions - Available functions
 * @returns A new interpreter state
 */
export const createInterpreterState = (
	context: Context = {},
	functions: Functions = {},
): InterpreterState => {
	return {
		context,
		functions,
	};
};

/**
 * Sets a function in the interpreter state
 * @param state - Current interpreter state
 * @param name - Function name
 * @param fn - Function implementation
 * @returns Updated interpreter state
 */
export const setFunction = (
	state: InterpreterState,
	name: string,
	fn: (...args: unknown[]) => unknown,
): InterpreterState => {
	return {
		...state,
		functions: {
			...state.functions,
			[name]: fn,
		},
	};
};

/**
 * Evaluates an AST and returns the result
 * @param ast - The AST to evaluate
 * @param state - Current interpreter state
 * @param context - Optional context to override the default context
 * @returns The result of evaluation
 * @example
 * const ast = parse(tokens);
 * const result = evaluate(ast, state);
 */
export const evaluate = (
	ast: Program,
	state: InterpreterState,
	context?: Context,
): unknown => {
	let evaluationState = state;
	if (context) {
		evaluationState = {
			...state,
			context: { ...state.context, ...context },
		};
	}

	// Define all evaluation functions within the closure to access evaluationState
	/**
	 * Evaluates a literal value
	 * @param node - Literal node
	 * @returns The literal value
	 * @example "hello" → "hello"
	 * @example 42 → 42
	 */
	const evaluateLiteral = (node: Literal): number | string | boolean | null => {
		return node.value;
	};

	/**
	 * Evaluates an identifier by looking up its value in the context
	 * @param node - Identifier node
	 * @returns The value from context
	 * @example data → context.data
	 */
	const evaluateIdentifier = (node: Identifier): unknown => {
		if (!(node.name in evaluationState.context)) {
			throw new ExpressionError(`Undefined variable: ${node.name}`);
		}
		return evaluationState.context[node.name];
	};

	/**
	 * Evaluates a member expression (property access)
	 * @param node - MemberExpression node
	 * @returns The accessed property value
	 * @example data.value → context.data.value
	 * @example data["value"] → context.data["value"]
	 */
	const evaluateMemberExpression = (node: MemberExpression): unknown => {
		const object = evaluateNode(node.object);
		if (object == null) {
			throw new ExpressionError("Cannot access property of null or undefined");
		}

		const property = node.computed
			? evaluateNode(node.property)
			: (node.property as Identifier).name;

		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		return (object as any)[property as string | number];
	};

	/**
	 * Evaluates a function call
	 * @param node - CallExpression node
	 * @returns The function result
	 * @example @sum(1, 2) → functions.sum(1, 2)
	 */
	const evaluateCallExpression = (node: CallExpression): unknown => {
		const func = evaluationState.functions[node.callee.name];
		if (!func) {
			throw new ExpressionError(`Undefined function: ${node.callee.name}`);
		}

		const args = node.arguments.map((arg) => evaluateNode(arg));
		return func(...args);
	};

	/**
	 * Evaluates a binary expression
	 * @param node - BinaryExpression node
	 * @returns The result of the binary operation
	 * @example a + b → context.a + context.b
	 * @example x > y → context.x > context.y
	 */
	const evaluateBinaryExpression = (node: BinaryExpression): unknown => {
		const left = evaluateNode(node.left);
		const right = evaluateNode(node.right);

		switch (node.operator) {
			case "+":
				if (typeof left === "number" && typeof right === "number") {
					return left + right;
				}
				return String(left) + String(right);
			case "-":
				return (left as number) - (right as number);
			case "*":
				return (left as number) * (right as number);
			case "/":
				return (left as number) / (right as number);
			case "%":
				return (left as number) % (right as number);
			case "===":
				return left === right;
			case "!==":
				return left !== right;
			case ">":
				return (left as number) > (right as number);
			case ">=":
				return (left as number) >= (right as number);
			case "<":
				return (left as number) < (right as number);
			case "<=":
				return (left as number) <= (right as number);
			case "&&":
				return (left as boolean) && (right as boolean);
			case "||":
				return (left as boolean) || (right as boolean);
			default:
				throw new ExpressionError(`Unknown operator: ${node.operator}`);
		}
	};

	/**
	 * Evaluates a unary expression
	 * @param node - UnaryExpression node
	 * @returns The result of the unary operation
	 * @example !valid → !context.valid
	 * @example -num → -context.num
	 */
	const evaluateUnaryExpression = (node: UnaryExpression): unknown => {
		const argument = evaluateNode(node.argument);

		if (node.prefix) {
			switch (node.operator) {
				case "!":
					return !argument;
				case "-":
					if (typeof argument !== "number") {
						throw new ExpressionError(
							`Cannot apply unary - to non-number: ${argument}`,
						);
					}
					return -argument;
				default:
					throw new ExpressionError(`Unknown operator: ${node.operator}`);
			}
		}
		// Currently we don't support postfix operators
		throw new ExpressionError(
			`Postfix operators are not supported: ${node.operator}`,
		);
	};

	/**
	 * Evaluates a conditional (ternary) expression
	 * @param node - ConditionalExpression node
	 * @returns The result of the conditional expression
	 * @example a ? b : c → context.a ? context.b : context.c
	 */
	const evaluateConditionalExpression = (
		node: ConditionalExpression,
	): unknown => {
		const test = evaluateNode(node.test);
		return test ? evaluateNode(node.consequent) : evaluateNode(node.alternate);
	};

	/**
	 * Evaluates a single AST node
	 * @param node - The node to evaluate
	 * @returns The result of evaluation
	 */
	const evaluateNode = (node: Expression): unknown => {
		try {
			switch (node.type) {
				case "Literal":
					return evaluateLiteral(node);
				case "Identifier":
					return evaluateIdentifier(node);
				case "MemberExpression":
					return evaluateMemberExpression(node);
				case "CallExpression":
					return evaluateCallExpression(node);
				case "BinaryExpression":
					return evaluateBinaryExpression(node);
				case "UnaryExpression":
					return evaluateUnaryExpression(node);
				case "ConditionalExpression":
					return evaluateConditionalExpression(node);
				default:
					throw new ExpressionError(
						`Unsupported node type: ${(node as Expression).type}`,
					);
			}
		} catch (error) {
			if (error instanceof ExpressionError) {
				throw new ExpressionError(`Evaluation error: ${error.message}`);
			}
			throw error;
		}
	};

	// Start evaluation with the root node
	return evaluateNode(ast.body);
};
