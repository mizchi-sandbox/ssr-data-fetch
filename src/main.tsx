import "@babel/polyfill"
import React, { Suspense } from "react";
import ReactDOMServer from "react-dom/server";
import { renderRoutes, matchRoutes, MatchedRoute } from "react-router-config";
import { StaticRouter } from "react-router-dom";
import ShallowRenderer from "react-test-renderer/shallow";
import { renderAsync, createResource } from "./ssr-helpers";

const shallowRenderer = ShallowRenderer.createRenderer();

// data fetcher
const resource = createResource(async (_key: string) => {
  await new Promise(r => setTimeout(r, 1000));
  return { message: "hello" };
});

function Home() {
  return <div>Home</div>;
}

function Foo() {
  const data = resource.read("/foo");
  return (
    <div>
      Foo
      <pre>
        <code>{JSON.stringify(data)}</code>
      </pre>
    </div>
  );
}

const routes = [
  {
    component: Home,
    exact: true,
    path: "/"
  },
  {
    component: Foo,
    exact: true,
    path: "/foo"
  }
];

function App() {
  return <>{renderRoutes(routes)}</>;
}

function preloadRouteAction(matches: MatchedRoute<any>[]): Promise<any> | null {
  let promises: Promise<any>[] = [];
  matches.forEach(m => {
    const C = m.route.component as React.ComponentType;
    try {
      shallowRenderer.render(<C {...m as any} />);
    } catch (err) {
      if (err instanceof Promise) {
        promises.push(err);
      }
    }
  });
  if (promises.length > 0) {
    return Promise.all(promises);
  }
  return null;
}

async function renderHtml(location: "/foo") {
  let once = false;
  const renderedHtml = await renderAsync({
    renderFunction: ReactDOMServer.renderToString,
    onBeforeRender() {
      // load once
      if (once) {
        return;
      }
      once = true;
      const matches = matchRoutes(routes, "/foo");
      const promise = preloadRouteAction(matches);
      if (promise) {
        throw promise;
      }
    },
    tree: (
      <StaticRouter location={location}>
        <App />
      </StaticRouter>
    )
  });
  return renderedHtml;
}

// Browser
import ReactDOM from "react-dom";
import { BrowserRouter } from "react-router-dom";

const root = document.querySelector(".root") as HTMLDivElement;

async function main() {
  // emulate ssr
  const html = await renderHtml("/foo");
  root.innerHTML = html;

  // hydrate
  ReactDOM.hydrate(
    <BrowserRouter>
      <Suspense fallback="loading">
        <App />
      </Suspense>
    </BrowserRouter>,
    root
  );
}

main();
