import type { FooService } from "./foo.service";

export interface Services {
	fooService: InstanceType<typeof FooService>;
}
