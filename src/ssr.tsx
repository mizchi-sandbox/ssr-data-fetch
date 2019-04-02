import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { renderRoutes } from "react-router-config";
import { StaticRouter } from 'react-router-dom';

function Home() {
  return <div>Home</div>
}

function Foo() {
  return <div>Foo</div>
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

const html = ReactDOMServer.renderToString(
  <StaticRouter location="/foo">
    <App />
  </StaticRouter>
);

// client: ReactDOM.render(<BrowserRouter><App /></BrowserRouter>)

console.log('html', html)