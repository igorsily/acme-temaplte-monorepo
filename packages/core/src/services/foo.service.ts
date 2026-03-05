import type { ListParams } from "@omnia/types/schemas/common.schema";
import type { CreateFooInput, Foo } from "@omnia/types/schemas/foo.schema";
import type { FooRepository } from "../repositories/foo.repository";

export class FooService {
	private readonly fooRepository: FooRepository;

	constructor(fooRepository: FooRepository) {
		this.fooRepository = fooRepository;
	}

	async create(input: CreateFooInput, userId: number): Promise<void> {
		await this.fooRepository.create(input, userId);
	}

	async list(params: ListParams): Promise<{ data: Foo[]; total: number }> {
		return await this.fooRepository.list(params);
	}
}

export type FooServiceType = InstanceType<typeof FooService>;
