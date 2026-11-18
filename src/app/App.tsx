import { useEffect, useState } from 'react';
import styles from './App.module.css';
import { useDependencies } from './dependencies';
import { describeError } from './describeError';
import type { RuntimeInfo } from './runtimeInfo';

type RuntimeInfoState =
  | { status: 'pending' }
  | { status: 'ready'; info: RuntimeInfo }
  | { status: 'failed'; message: string };

export function App() {
  const { runtimeInfo } = useDependencies();
  const [state, setState] = useState<RuntimeInfoState>({ status: 'pending' });

  useEffect(() => {
    let ignore = false;
    runtimeInfo.loadRuntimeInfo().then(
      (info) => {
        if (!ignore) setState({ status: 'ready', info });
      },
      (error: unknown) => {
        if (!ignore) setState({ status: 'failed', message: describeError(error) });
      },
    );

    return () => {
      ignore = true;
    };
  }, [runtimeInfo]);

  return (
    <main className={styles.screen}>
      <h1 className={styles.title}>Upkeep</h1>
      <p className={styles.status}>
        <RuntimeInfoLine state={state} />
      </p>
    </main>
  );
}

function RuntimeInfoLine({ state }: { state: RuntimeInfoState }) {
  switch (state.status) {
    case 'pending':
      return <>Adapter: ...</>;

    case 'ready':
      return (
        <>
          Adapter: <span className={styles.adapter}>(state.info.adapter)</span> · v
          {state.info.version}
        </>
      );

    case 'failed':
      return <>Adapter: unavailable · {state.message}</>;
  }
}
