import { useEffect, useState } from 'react';
import { DeckDetailScreen } from '../features/deckDetail/DeckDetailScreen';
import styles from './App.module.css';
import { useDependencies } from './dependencies';
import { describeError } from './describeError';
import type { RuntimeInfo } from './runtimeInfo';

type RuntimeInfoState =
  | { status: 'pending' }
  | { status: 'ready'; info: RuntimeInfo }
  | { status: 'failed'; message: string };

export function App() {
  const { runtimeInfo, startDeckId } = useDependencies();
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
    <div className={styles.shell}>
      <header className={styles.bar}>
        <span className={styles.title}>Upkeep</span>
        <span className={styles.status}>
          <RuntimeInfoLine state={state} />
        </span>
      </header>
      <div className={styles.column}>
        <DeckDetailScreen deckId={startDeckId} />
      </div>
    </div>
  );
}

function RuntimeInfoLine({ state }: { state: RuntimeInfoState }) {
  switch (state.status) {
    case 'pending':
      return <>Adapter: …</>;

    case 'ready':
      return (
        <>
          Adapter: <span className={styles.adapter}>{state.info.adapter}</span> · v
          {state.info.version}
        </>
      );

    case 'failed':
      return <>Adapter: unavailable · {state.message}</>;
  }
}
