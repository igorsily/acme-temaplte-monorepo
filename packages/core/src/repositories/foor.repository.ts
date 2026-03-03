import type { ListParams } from "@acme/types/schemas/common.schema";
import type {
	CreateFooInput,
	Foo,
} from "@acme/types/schemas/foo.schema";

export interface FooRepository {
	create(input: CreateFooInput, userId: number): Promise<void>;
	list(params: ListParams): Promise<{ data: Foo[]; total: number }>;
}
