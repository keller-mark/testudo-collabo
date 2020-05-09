import React, { useState, useCallback, useEffect } from 'react';
import PubSub from 'pubsub-js';
import { Button, ButtonGroup, AnchorButton, Drawer, Tag } from "@blueprintjs/core";
import { IconNames } from "@blueprintjs/icons";
import TestudoCanvas from './TestudoCanvas';
import ItemList from './ItemList';

import { HAND_RUBBING, HAND_PLACING, WS_URL, EVENT_LOAD } from './constants';

function App() {

  const [handState, setHandState] = useState(HAND_RUBBING);
  const [isPicking, setIsPicking] = useState(false);
  const [item, setItem] = useState(null);

  useEffect(() => {
    const socket = new WebSocket(WS_URL + '/rub-or-donate');

    // Connection opened
    socket.addEventListener('open', (event) => {
        socket.send(JSON.stringify({"type": "init"}));
    });

    // Listen for messages
    socket.addEventListener('message', (event) => {
        const { data } = event;
        data.arrayBuffer().then((buf) => {
            const arr = new Uint16Array(buf);
            PubSub.publish(EVENT_LOAD, arr);
        });
    });

    // Connection closed
    socket.addEventListener('close', (event) => {
        console.log('Closed websocket connection', event);
    });
  }, []);

  const onSelectItem = useCallback((name) => {
    setIsPicking(false);
    setItem(name);
    setHandState(HAND_PLACING);
  });

  return (
    <div className="app">
      <div className="header">
        <div className="header-left">

          <ButtonGroup>
            <Button large text="✋ Rub nose" active={handState === HAND_RUBBING} onClick={() => setHandState(HAND_RUBBING)}/>
            <Button large text="👇 Donate item" active={handState === HAND_PLACING} onClick={() => setIsPicking(true)}/>
          </ButtonGroup>
        </div>
        <div className="header-right">
          <AnchorButton text="The original" href="https://ellielitwack.github.io/testudosimulator/" rightIcon={IconNames.SHARE} />
          <AnchorButton text="Contribute" href="https://github.com/keller-mark/testudo-collabo" rightIcon={IconNames.CODE} />
        </div>
      </div>
      <div className="background">
        <TestudoCanvas handState={handState} item={item} />
      </div>
      <div className="footer">
        <p><Tag>rubs</Tag> <Tag minimal>4</Tag> last hour, <Tag minimal>10</Tag> today, <Tag minimal>12</Tag> all time.</p>
        <p><Tag>donations</Tag> <Tag minimal>400</Tag> last hour, <Tag minimal>10</Tag> today, <Tag minimal>12</Tag> all time.</p>
      </div>

      <Drawer
        isOpen={isPicking}
        onClose={() => setIsPicking(false)}
        title="Select item to donate"
      >
        <ItemList
          onSelect={onSelectItem}
        />
      </Drawer>
    </div>
  );
}

export default App;
