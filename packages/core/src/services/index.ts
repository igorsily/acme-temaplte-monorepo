import type { DocumentService } from "./document.service";
import type { FooService } from "./foo.service";

export interface Services {
	documentService: InstanceType<typeof DocumentService>;
	fooService: InstanceType<typeof FooService>;
}
