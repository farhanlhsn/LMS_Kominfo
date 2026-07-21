import { Controller, Get, Header, Inject, Optional, Req } from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import { buildOpenApiDocument } from "./openapi-document";

/**
 * Fallback OpenAPI endpoints.
 * When Nest Swagger is bootstrapped, /api/v1/docs and /api/v1/docs-json are preferred.
 * These remain for clients that used the hand-maintained paths.
 */
@Controller("openapi")
export class OpenApiController {
  constructor(
    @Optional() @Inject(HttpAdapterHost) private readonly adapterHost?: HttpAdapterHost,
  ) {}

  @Get("json")
  @Header("Cache-Control", "public, max-age=60")
  getJson(@Req() req: { app?: { getHttpAdapter?: () => unknown } }) {
    // Prefer runtime Swagger document if already registered on the app instance.
    const swaggerDoc = (globalThis as { __LMS_OPENAPI__?: unknown }).__LMS_OPENAPI__;
    if (swaggerDoc) return swaggerDoc;
    void req;
    void this.adapterHost;
    return buildOpenApiDocument();
  }

  @Get()
  @Header("Content-Type", "text/html; charset=utf-8")
  getUi() {
    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>LMS API Docs</title>
  <meta http-equiv="refresh" content="0;url=/api/v1/docs"/>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"/>
</head>
<body>
  <p>Redirecting to <a href="/api/v1/docs">/api/v1/docs</a>…</p>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: '/api/v1/docs-json',
      dom_id: '#swagger-ui',
      presets: [SwaggerUIBundle.presets.apis],
    });
  </script>
</body>
</html>`;
  }
}
