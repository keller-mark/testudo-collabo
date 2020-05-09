import React, { useRef, useEffect } from 'react';
import { Classes } from "@blueprintjs/core";
import { itemToPath } from './utils';
import { ITEMS } from './constants';


export default function ItemList(props) {
    const { onSelect } = props;

    return (
        <div className={Classes.DRAWER_BODY}>
            <div className="item-list">
                {ITEMS.map((item) => (
                    <div
                        key={item}
                        className="item"
                        style={{backgroundImage: `url('${itemToPath(item)}')`}}
                        onClick={() => onSelect(item)}
                    />
                ))}
            </div>
        </div>
    );
}