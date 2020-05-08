import React, { useRef, useEffect } from 'react';
import { Classes } from "@blueprintjs/core";
import { items, itemToPath } from './constants';


export default function ItemList(props) {
    const { onSelect } = props;

    return (
        <div className={Classes.DRAWER_BODY}>
            <div className="item-list">
                {items.map((name) => (
                    <div
                        key={name}
                        className="item"
                        style={{backgroundImage: `url('${itemToPath(name)}')`}}
                        onClick={() => onSelect(name)}
                    />
                ))}
            </div>
        </div>
    );
}