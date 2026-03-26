import type { FooRepository } from "@omnia/core";
import type { ListParams } from "@omnia/types/schemas/common.schema";
import {
	type CreateFooInput,
	type Foo,
	fooSchema,
} from "@omnia/types/schemas/foo.schema";
import { asc, count, desc, ilike } from "drizzle-orm";
import type { db } from "..";
import { foo } from "../schema/foo";

const sortableColumns = {
	name: foo.name,
	value: foo.value,
} satisfies Record<string, unknown>;

export class DrizzleFooRepository implements FooRepository {
	private readonly db: typeof db;

	constructor(dbInstance: typeof db) {
		this.db = dbInstance;
	}

	async list(params: ListParams): Promise<{ data: Foo[]; total: number }> {
		const { page, limit, sort, search } = params;
		const offset = (page - 1) * limit;

		const [sortCol, sortDir] = (sort ?? "created_at.desc").split(".");
		const col =
			sortableColumns[sortCol as keyof typeof sortableColumns] ?? foo.createdAt;
		const orderBy = sortDir === "asc" ? asc(col) : desc(col);

		const whereClause = search ? ilike(foo.name, `%${search}%`) : undefined;

		const [rows, [totalCount]] = await Promise.all([
			this.db
				.select()
				.from(foo)
				.where(whereClause)
				.orderBy(orderBy)
				.limit(limit)
				.offset(offset),
			this.db.select({ count: count() }).from(foo).where(whereClause),
		]);

		return {
			data: rows.map((row) => fooSchema.parse(row)),
			total: Number(totalCount?.count ?? 0),
		};
	}

	async create(input: CreateFooInput, userId: number): Promise<void> {
		await this.db.insert(foo).values({
			name: input.name,
			value: input.value,
			userId,
		});
	}
}
