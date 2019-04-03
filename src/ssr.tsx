import React, { Suspense } from 'react';
import ReactDOMServer from 'react-dom/server';
import { renderRoutes, matchRoutes, MatchedRoute } from "react-router-config";
import { StaticRouter } from 'react-router-dom';
import { getMarkupFromTree } from './getMarkupFromTree'
import ShallowRenderer from 'react-test-renderer/shallow';

const shallowRenderer = ShallowRenderer.createRenderer();

function createResource<T>(fn: (key: string) => T) {
  const cache = new Map();
  const load = (key: string) => new Promise(async (resolve, _reject) => {
    const data = await fn(key);
    cache.set(key, data);
    resolve(data);
  });
  return {
    preload(key: string) {
      return load(key);
    },
    read(key: string) {
      if (cache.has(key)) {
        return cache.get(key);
      } else {
        throw load(key);
      }    
    }
  }
}

const resource = createResource(async (_key: string) => {
  await new Promise(r => setTimeout(r, 1000));
  return { message: 'hello' };
});

function Home() {
  return <div>Home</div>
}

function Foo() {
  const data = resource.read('/foo');
  return <div>
    Foo 
    <pre><code>{JSON.stringify(data)}</code></pre>  
  </div>
}

const routes = [
  {
    component: Home,
    exact: true,
    path: '/'
  },
  {
    component: Foo,
    exact: true,
    path: '/foo'
  }
]

function App() {
  return (<>
    {renderRoutes(routes)}
  </>);
}

function preloadRouteAction(matches: MatchedRoute<any>[]): Promise<any> | null {
  let promises: Promise<any>[] = [];
  matches.forEach(m => {
    const C = m.route.component as React.ComponentType;
    try {
      shallowRenderer.render(<C {...m as any}/>);
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

async function run() {
  let once = false;
  const location = '/foo';

  const renderedHtml = await getMarkupFromTree({
    renderFunction: ReactDOMServer.renderToString,
    onBeforeRender() {
      // load once
      if (once) {
        return;
      }
      once = true;
      const matches = matchRoutes(routes, '/foo');
      const promise = preloadRouteAction(matches);
      if (promise) {
        throw promise
      }
    },
    tree: (
      <StaticRouter location={location}>
        <App />
      </StaticRouter>
    ),
  });
  console.log(renderedHtml)
}

run();

