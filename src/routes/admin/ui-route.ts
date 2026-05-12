import { Hono } from "hono"
import path from "node:path"

export const adminUiRoutes = new Hono()

const ADMIN_DIST_DIR = path.join(process.cwd(), "dist", "admin")
const ADMIN_ASSETS_DIR = path.join(ADMIN_DIST_DIR, "assets")
const ADMIN_INDEX_PATH = path.join(ADMIN_DIST_DIR, "index.html")
const ADMIN_SPA_FALLBACK_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Copilot API Admin</title>
  </head>
  <body>
    <div id="app"></div>
  </body>
</html>`

function getAdminAssetPath(requestPath: string): string | null {
  const prefix = "/admin/assets/"
  if (!requestPath.startsWith(prefix)) {
    return null
  }

  const relativePath = requestPath.slice(prefix.length).trim()
  if (!relativePath) {
    return null
  }

  const resolvedPath = path.resolve(ADMIN_ASSETS_DIR, relativePath)
  return resolvedPath.startsWith(ADMIN_ASSETS_DIR) ? resolvedPath : null
}

function getContentType(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase()

  switch (extension) {
    case ".css": {
      return "text/css; charset=utf-8"
    }
    case ".js": {
      return "text/javascript; charset=utf-8"
    }
    case ".json": {
      return "application/json; charset=utf-8"
    }
    case ".svg": {
      return "image/svg+xml"
    }
    case ".png": {
      return "image/png"
    }
    case ".jpg":
    case ".jpeg": {
      return "image/jpeg"
    }
    case ".webp": {
      return "image/webp"
    }
    default: {
      return "application/octet-stream"
    }
  }
}

async function renderAdminSpaShell(): Promise<Response> {
  const indexFile = Bun.file(ADMIN_INDEX_PATH)

  if (await indexFile.exists()) {
    return new Response(indexFile, {
      headers: {
        "cache-control": "no-store",
        "content-type": "text/html; charset=utf-8",
      },
    })
  }

  return new Response(ADMIN_SPA_FALLBACK_HTML, {
    headers: {
      "cache-control": "no-store",
      "content-type": "text/html; charset=utf-8",
    },
  })
}

adminUiRoutes.get("/assets/*", async (c) => {
  const assetPath = getAdminAssetPath(c.req.path)
  if (!assetPath) {
    return c.notFound()
  }

  const asset = Bun.file(assetPath)
  if (!(await asset.exists())) {
    return c.notFound()
  }

  return new Response(asset, {
    headers: {
      "content-type": getContentType(assetPath),
      "cache-control": "public, max-age=31536000, immutable",
    },
  })
})

adminUiRoutes.get("*", async (c) => {
  if (c.req.path.startsWith("/admin/api/")) {
    return c.notFound()
  }

  return renderAdminSpaShell()
})
