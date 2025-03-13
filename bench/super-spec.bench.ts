import { bench, describe } from "vitest";
import { Expression } from "../src";

const context = {
	user: {
		name: "John",
		age: 30,
		isAdmin: true,
		scores: [85, 90, 78, 92],
		address: {
			city: "New York",
			zip: "10001",
		},
	},
	products: [
		{ id: 1, name: "Laptop", price: 1200 },
		{ id: 2, name: "Phone", price: 800 },
		{ id: 3, name: "Tablet", price: 500 },
	],
	calculateTotal: function (items: any[]) {
		const total = items.reduce((sum, item) => sum + item.price, 0);
		return total;
	},
	applyDiscount: function (total: number, percentage: number) {
		const value = total * (1 - percentage / 100);
		return value;
	},
};

// 测试表达式
const simpleExpression = "user.age + 5";
const mediumExpression = 'user.scores[2] > 80 ? "Good" : "Needs improvement"';
const complexExpression =
	'@applyDiscount(@calculateTotal(products), 10) > 2000 ? "High value" : "Standard"';

const complexExpression2 =
	'applyDiscount(calculateTotal(products), 10) > 2000 ? "High value" : "Standard"';

// 预编译表达式
const graphSecureEvalSimpleCompile = new Expression(simpleExpression)
	.configure({ strictMode: false })
	.compile();
const graphSecureEvalMediumCompile = new Expression(mediumExpression)
	.configure({ strictMode: false })
	.compile();
const graphSecureEvalComplexCompile = new Expression(complexExpression)
	.configure({ strictMode: false })
	.extend({
		calculateTotal: context.calculateTotal,
		applyDiscount: context.applyDiscount,
	})
	.compile();

// 创建 Function 对象
const newFunctionSimple = new Function(
	"context",
	`with(context) { return ${simpleExpression}; }`,
);
const newFunctionMedium = new Function(
	"context",
	`with(context) { return ${mediumExpression}; }`,
);
const newFunctionComplex = new Function(
	"context",
	`with(context) { return ${complexExpression2}; }`,
);

describe("Simple Expression Benchmarks", () => {
	bench("graph_secure_eval (baseline)", () => {
		graphSecureEvalSimpleCompile.evaluate(context);
	});

	bench("new Function (vs graph_secure_eval)", () => {
		newFunctionSimple(context);
	});
});

describe("Medium Expression Benchmarks", () => {
	bench("graph_secure_eval (baseline)", () => {
		graphSecureEvalMediumCompile.evaluate(context);
	});

	bench("new Function (vs graph_secure_eval)", () => {
		newFunctionMedium(context);
	});
});

describe("Complex Expression Benchmarks", () => {
	bench("graph_secure_eval (baseline)", () => {
		graphSecureEvalComplexCompile.evaluate(context);
	});

	bench("new Function (vs graph_secure_eval)", () => {
		newFunctionComplex(context);
	});
});
