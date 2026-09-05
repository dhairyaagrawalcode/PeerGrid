import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { getLoadingLayout } from "../app/lib/loading-layout.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
const platform = join(root, "app/(platform)");

test("every authenticated page has a destination-specific loading layout", () => {
  function check(directory: string) {
    for (const item of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, item.name);
      if (item.isDirectory()) check(path);
      if (item.name !== "page.tsx") continue;
      const route = `/${relative(platform, directory)}`;
      assert.notEqual(getLoadingLayout(route), "generic", `${route} must not use the generic skeleton`);
      assert.ok(existsSync(join(directory, "loading.tsx")), `${route} needs its own navigation boundary`);
      const loader = readFileSync(join(directory, "loading.tsx"), "utf8");
      assert.ok(loader.includes(`kind="${getLoadingLayout(route)}"`), `${route} disagrees with the auth-shell fallback`);
    }
  }
  check(platform);
});

test("nested pages do not reuse a parent page's skeleton", () => {
  assert.equal(getLoadingLayout("/profile"), "profile");
  assert.equal(getLoadingLayout("/profile/edit"), "edit-profile");
  assert.equal(getLoadingLayout("/students/some-student"), "profile");
  assert.equal(getLoadingLayout("/messages"), "messages");
  assert.equal(getLoadingLayout("/messages/conversation-id"), "thread");
  assert.equal(getLoadingLayout("/post"), "post");
  assert.equal(getLoadingLayout("/collaboration"), "collaborate");
  assert.equal(getLoadingLayout("/collaborate/"), "collaborate");
  assert.equal(getLoadingLayout("/messages-unrelated"), "generic");
});

test("initial auth loading uses the route resolver, not a generic placeholder", () => {
  const layout = readFileSync(join(platform, "layout.tsx"), "utf8");
  const shell = readFileSync(join(root, "app/components/platform-shell-skeleton.tsx"), "utf8");
  const loading = readFileSync(join(platform, "loading.tsx"), "utf8");
  assert.ok(layout.includes("fallback={<PlatformShellSkeleton />}"));
  assert.ok(shell.includes("<PlatformLoading />"));
  assert.ok(loading.includes("getLoadingLayout(usePathname())"));
  assert.ok(layout.includes("await requireStudent()"), "loading must not bypass authentication");
});

test("streaming sections use component-specific placeholders", () => {
  const feed = readFileSync(join(platform, "feed/page.tsx"), "utf8");
  for (const name of ["FeedProfile", "FeedPosts", "FeedPeople", "FeedCollaborations"]) {
    assert.ok(feed.includes(`fallback={<${name}Skeleton />}`));
  }
  for (const path of ["profile/page.tsx", "students/[username]/page.tsx"]) {
    const page = readFileSync(join(platform, path), "utf8");
    assert.ok(page.includes("fallback={<ProfileProofsSkeleton />}"));
    assert.ok(page.includes("fallback={<ProfilePostsSkeleton />}"));
    assert.ok(!page.includes("<SectionSkeleton"));
  }
});
