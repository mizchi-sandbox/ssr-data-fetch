// Extract from https://github.com/trojanowski/react-apollo-hooks
import React from 'react';

const SSRContext = React.createContext<null | SSRManager>(null);

interface SSRManager {
  hasPromises(): boolean;
  register(promise: PromiseLike<any>): void;
  consumeAndAwaitPromises(): Promise<any>;
}

function createSSRManager(): SSRManager {
  const promiseSet = new Set<PromiseLike<any>>();

  return {
    hasPromises: () => promiseSet.size > 0,
    register: promise => {
      promiseSet.add(promise);
    },
    consumeAndAwaitPromises: () => {
      const promises = Array.from(promiseSet);
      promiseSet.clear();
      return Promise.all(promises);
    },
  };
}

interface GetMarkupFromTreeOptions {
  tree: React.ReactNode;
  onBeforeRender?: () => any;
  renderFunction: (tree: React.ReactElement<object>) => string;
}

export function getMarkupFromTree({
  tree,
  onBeforeRender,
  renderFunction,
}: GetMarkupFromTreeOptions): Promise<string> {
  const ssrManager = createSSRManager();

  function process(): string | Promise<string> {
    try {
      if (onBeforeRender) {
        onBeforeRender();
      }
      const html = renderFunction(
        <SSRContext.Provider value={ssrManager}>{tree}</SSRContext.Provider>
      );

      if (!ssrManager.hasPromises()) {
        return html;
      }
    } catch (e) {
      if (!(e instanceof Promise)) {
        throw e;
      }

      ssrManager.register(e);
    }

    return ssrManager.consumeAndAwaitPromises().then(process);
  }

  return Promise.resolve().then(process);
}