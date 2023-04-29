import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import {
  compileMDX,
  MDXRemoteProps,
  type CompileMDXResult,
} from "next-mdx-remote/rsc";
import { z } from "zod";
import rehypeSlug from "rehype-slug";
import {
  ProseAnchor,
  ProseBlockquote,
  ProseH1,
  ProseH2,
  ProseH3,
  ProseH4,
  ProseInlineCode,
  ProseP,
  ProseStrong,
  ProseUL,
} from "@components/Typography";

// ⚙️ Config settings
export const blogDir = "src/blog";
const fileExtension = ".mdx";

// ⚙️ Type definitions

const frontmatterSchema = z.object(
  {
    title: z.string({
      required_error: "Title is required",
    }),
    date: z.string({
      required_error: "Date is required",
    }),
    description: z.string({
      required_error: "Description is required",
    }),
    author: z.string({
      required_error: "Author is required",
    }),
    github: z.optional(z.string()),
  },
  {
    required_error: "Post not found",
  }
);

type FrontMatter = z.infer<typeof frontmatterSchema>;

const metaSchema = frontmatterSchema.extend({
  id: z.string(),
  slug: z.string(),
});

type PostMeta = z.infer<typeof metaSchema>;

// 🧪 Helper functions

function filenameToId(filename: string): string {
  return filename.toLowerCase().replace(fileExtension, "");
}

function slugify(filename: string, title: string): string {
  const id = filenameToId(filename);
  const slugedTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  // ⬇️ Example from "001.mdx & Hello World" to "001-hello-world"
  return id + "-" + slugedTitle;
}

function getFilename(slug: string): string {
  const filename = metaSchema.shape.id.parse(slug.match(/^[^-]*/)?.[0]);
  return filename + fileExtension;
}

// ⬇️ Component mappings

const components = {
  h1: ProseH1,
  h2: ProseH2,
  h3: ProseH3,
  h4: ProseH4,
  p: ProseP,
  a: ProseAnchor,
  strong: ProseStrong,
  blockquote: ProseBlockquote,
  ul: ProseUL,
  code: ProseInlineCode,
} as MDXRemoteProps["components"];

// 🟢 RSC Available Functions

export async function getPosts(blogDir: string): Promise<PostMeta[]> {
  // ⬇️ Read our designated file directory
  const files = readdirSync(blogDir);
  const posts = await Promise.all(
    files.map(async (filename) => {
      // ⬇️ Get the file's source content
      const source = readFileSync(join(blogDir, filename), "utf-8");
      // ⬇️ Compile its frontmatter
      const { frontmatter } = await compileMDX<FrontMatter>({
        source,
        options: { parseFrontmatter: true },
      });
      // ⬇️ Parse its frontmatter
      const { title, date, description, author, github } =
        frontmatterSchema.parse(frontmatter);
      // ⬇️ Return parsed meta data with an included id and slug
      return metaSchema.parse({
        title,
        date,
        description,
        author,
        github,
        id: filenameToId(filename),
        slug: slugify(filename, title),
      });
    })
  );
  // ⬇️ Coerce to number and sort in descending order
  return posts.sort((a, b) => +b.id - +a.id);
}

export async function getPost(
  blogDir: string,
  slug: string
): Promise<CompileMDXResult<PostMeta>> {
  const filename = getFilename(slug);
  const source = readFileSync(join(blogDir, filename), "utf8");
  return await compileMDX<PostMeta>({
    source,
    options: {
      parseFrontmatter: true,
      mdxOptions: {
        rehypePlugins: [rehypeSlug],
      },
    },
    components,
  });
}
