# DsaDrillFront

## Knowledge library

The library entry point is `/library`. Its subject cards and tabs come from
`src/app/modules/library/library-catalog.ts`; the backend only stores Markdown
articles and their topic groups, keyed by subject/section codes. Public articles
have a topic outline, a readable serif content column, heading navigation, and
previous/next links in learning order.

Use `/admin` as the single administration workspace for articles, questions,
and question tags. Add or change subjects and sections in the frontend catalog.
New articles are filed automatically, so there is no topic-group setup. All form
fields use Angular Material. The full-page
article editor supports inline Markdown formatting, code, tables, images,
Markdown import/export, source view, private draft autosave, preview, and
explicit publication. Public pages always read the backend's published snapshot.

The Markdown editor's JavaScript and styles load only in the writing experience.
Its source is under `src/app/modules/library/`, alongside the public library
pages, API client, models, and route resolvers.

Deploy the backend catalog/revision migrations (including
`V11__frontend_owned_catalog.sql`) before this frontend. See
`../dsa-drill-backend/docs/library.md` for migration ordering and legacy-content
mapping. Both the Node and Vercel sitemaps enumerate the frontend catalog and
published article URLs.

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.1.4.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
