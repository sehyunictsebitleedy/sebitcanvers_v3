import test from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import { createSample } from "../src/dashboard/samples";
import { createExportZip } from "../src/dashboard/export";
import { thirdPartyNotices } from "../src/thirdPartyNotices";

test("downloaded ZIP includes the complete icon and tool license notices", async () => {
  const zip = await JSZip.loadAsync(await createExportZip({ ...createSample(), status: "finalized" }, ""));
  assert.equal(await zip.file("THIRD_PARTY_NOTICES.txt")!.async("string"), thirdPartyNotices);
  assert.match(thirdPartyNotices, /Lucide Icons and Contributors/);
  assert.match(thirdPartyNotices, /Cole Bemis/);
  assert.match(await zip.file("README.md")!.async("string"), /THIRD_PARTY_NOTICES.txt/);
});
