import type { ChangedFile } from "../../shared/types.ts";
import { MAX_PASS_FILES } from "./passFormat.ts";

export {
  HANDOFF_STUB,
  MAX_HANDOFF_CHARS,
  V1_CONTINUE_MD,
  V1_CONTINUE_PROMPT,
  assessHandoffQuality,
  isHandoffStub,
  isUsefulHandoff
} from "./passFormat.ts";

export const MAX_HANDOFF_FILES = MAX_PASS_FILES;

export function budgetChangedFiles(files: ChangedFile[]): { files: ChangedFile[]; omitted: number } {
  if (files.length <= MAX_PASS_FILES) return { files, omitted: 0 };
  return { files: files.slice(0, MAX_PASS_FILES), omitted: files.length - MAX_PASS_FILES };
}
