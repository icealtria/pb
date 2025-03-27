import { Hono } from "hono/quick";
import { dataSchema } from "./schema";
import { formValid } from "./formValid";
import { highlight } from "./highlight";
import home from "./home";
import { PasteService } from "./service";

type Env = {
  HOST: string;
  DB: D1Database;
};

type Variables = {
  content: string | Uint8Array;
  contentType: string;
  addr: string;
  sunset?: number;
};

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.route("/", home);

app.use("/:id?", formValid);

app.post("/u", async (c) => {
  const content = c.get("content");
  const addr = c.get("addr");
  const ttl = c.get("sunset");

  if (typeof content !== "string") {
    return c.text("Invalid content format: must be a string\n", 400);
  }

  try {
    const url = new URL(content);
    const service = new PasteService(c.env.DB);
    const result = await service.createUrlPaste(url.origin, ttl);
    return c.text(
      `url: ${addr}/${result.slug}\nid: ${result.id}\nsunset: ${result.sunset}\n`,
    );
  } catch (err: any) {
    if (err.message.includes("Invalid URL string.")) {
      return c.text("Invalid content format: must be a url\n", 400);
    }
    console.error(err);
    return c.text("Internal Server Error\n", 500);
  }
});

app.post("/:label?", async (c) => {
  const label = c.req.param("label");

  if (label) {
    if (!label.startsWith("@") && !label.startsWith("~")) {
      return c.text("Invalid label: must start with @ or ~\n", 400);
    }
    if (label.length < 2) {
      return c.text(
        "Invalid label: must be at least 2 characters (including @ or ~)\n",
        400,
      );
    }
  }

  const addr = c.get("addr");
  const content = c.get("content");
  const contentType = c.get("contentType");
  const ttl = c.get("sunset");

  try {
    const service = new PasteService(c.env.DB);
    const result = await service.createPaste({
      content,
      contentType,
      ttl,
      label,
    });

    if (c.req.query("u") === "1") {
      return c.text(`url: ${addr}/${result.slug}`);
    }

    return c.text(
      `url: ${addr}/${result.slug}\nid: ${result.id}\nsunset: ${result.sunset}\n`,
    );
  } catch (err: any) {
    if (err.message.includes("Label")) {
      return c.text(`'${label}' already exists at ${addr}/${label}\n`);
    }
    console.error(err);
    return c.text("Internal Server Error\n", 500);
  }
});

app.get("/:id/:hl?", async (c) => {
  const service = new PasteService(c.env.DB);
  const paste = await service.getPaste(c.req.param("id"));
  if (!paste) return c.notFound();

  const parsed = dataSchema.safeParse(paste);
  if (!parsed.success) {
    console.error(parsed.error);
    return c.text("Internal Server Error\n", 500);
  }

  if (parsed.data.content_type === "url") {
    return c.redirect(parsed.data.content);
  }
  const data = parsed.data;

  if (data.expires_at < new Date()) {
    await service.deletePaste(data.id);
    return c.notFound();
  }

  c.header("Content-Type", data.content_type);
  if (data.content_type.startsWith("text/")) {
    const hl = c.req.param("hl");
    if (hl) {
      return c.html(highlight(data.content, hl));
    }
    return c.text(data.content);
  }
  return c.body(data.content);
})
  .put("/:id", async (c) => {
    const { id } = c.req.param();
    const content = c.get("content");
    const contentType = c.get("contentType");

    try {
      const service = new PasteService(c.env.DB);
      await service.updatePaste(id, content, contentType);
      return c.text(`${c.get("addr")}/${id} updated\n`);
    } catch (err) {
      if (err instanceof Error && err.message === "Paste not found") {
        return c.notFound();
      }
      console.error(err);
      return c.text("Internal Server Error\n", 500);
    }
  })
  .delete("/:id", async (c) => {
    const { id } = c.req.param();

    try {
      const service = new PasteService(c.env.DB);
      await service.deletePaste(id);
      return c.text("deleted\n");
    } catch (err) {
      if (err instanceof Error && err.message === "Paste not found") {
        return c.notFound();
      }
      console.error(err);
      return c.text("Internal Server Error\n", 500);
    }
  });

export const scheduled: ExportedHandlerScheduledHandler<Env> = async (
  event,
  env,
  ctx,
) => {
  const service = new PasteService(env.DB);
  await service.deleteExpired();
};

export default {
  fetch: app.fetch,
  scheduled,
};
