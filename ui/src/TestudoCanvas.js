import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Tag } from "@blueprintjs/core";
import PubSub from 'pubsub-js';
import { json as d3_json } from 'd3-fetch';
import { Stage, Container, Text, Sprite, useApp } from '@inlet/react-pixi';
import range from 'lodash/range';
import throttle from 'lodash/throttle';
import clamp from 'lodash/clamp';
import { itemToPath, itemToInt, intToItem, sum } from './utils';
import { HAND_PLACING, ITEMS, EVENT_LOAD, GRID_SIZE, GRID_WIDTH, GRID_HEIGHT, 
    AR, HTTP_URL, ITEM_MASK, TERP_MASK } from './constants';

function ItemSprites(props) {
    const {
        arr,
        item,
        width,
        height,
        opacity = 1,
        scale = 1,
        logScaleAlpha = false,
    } = props;

    if(!arr) {
        return null;
    }
    const xi = width / GRID_WIDTH;
    const yi = height / GRID_HEIGHT;

    const itemWidth = scale*width/20;
    const itemHeight = itemWidth;
    const itemPath = itemToPath(item);
    
    return range(GRID_HEIGHT).map((i) => (
        range(GRID_WIDTH).map((j) => {
            const iFlat = GRID_WIDTH*i + j;
            let count = arr[iFlat];
            if(logScaleAlpha && count > 0) {
                count = Math.log10(count+1);
            }
            const alpha = clamp(opacity*count, 0, 1);
            return (
                <Sprite
                    key={`${i}-${j}`}
                    image={itemPath}
                    x={j*xi}
                    y={i*yi}
                    width={itemWidth}
                    height={itemHeight}
                    alpha={alpha}
                />
            );
        })
    ));
}

function HandSprites(props) {
    const { arr, width, height } = props;
    const item = 'raised-hand-emoji';

    return (
        <ItemSprites
            key={item}
            item={item}
            arr={arr}
            width={width}
            height={height}
            opacity={0.5}
            logScaleAlpha={true}
        />
    );
}

function DonationSprites(props) {
    const { data, width, height } = props;
    return (Object.entries(data).map(([item, arr]) => (
        <ItemSprites
            key={item}
            item={item}
            arr={arr}
            width={width}
            height={height}
            opacity={1}
            scale={1.5}
        />
    )));
}

export default function TestudoCanvas(props) {
    const { handState, item } = props;
    const isPlacing = (handState === HAND_PLACING && item);
    const divRef = useRef();
    const [width, setWidth] = useState(null);
    const [height, setHeight] = useState(null);
    const [top, setTop] = useState(0);
    const [left, setLeft] = useState(0);
    const [data, setData] = useState({});
    const [rubTotal, setRubTotal] = useState(0);
    const [itemTotals, setItemTotals] = useState({});

    useEffect(() => {
        const token = PubSub.subscribe(EVENT_LOAD, (msg, arr) => {
            const i = arr[0];
            const item = intToItem(i);
            const data = arr.subarray(1);

            // Store the new array.
            setData(prevData => ({ ...prevData, [item]: data }));

            // Compute sum.
            const total = data.reduce(sum);
            if(item === "rubs") {
                setRubTotal(total);
            } else {
                setItemTotals(prevTotals => ({ ...prevTotals, [item]: total }));
            }
        });
        return () => PubSub.unsubscribe(token);
    }, []);

    useEffect(() => {
        const resizeHandler = () => {
            const { width: divWidth, top: divTop, left: divLeft } = divRef.current.getBoundingClientRect();
            setWidth(divWidth);
            setHeight(divWidth/AR);
            setTop(divTop);
            setLeft(divLeft);
        }
        resizeHandler();
        window.addEventListener('resize', resizeHandler);
        return () => window.removeEventListener('resize', resizeHandler);
    }, []);

    const onPointerDown = useCallback(throttle((event) => {
        const origEvent = event.data.originalEvent;
        if(origEvent) {
            const x = origEvent.clientX - left;
            const y = origEvent.clientY - top;

            const xi = width / GRID_WIDTH;
            const yi = height / GRID_HEIGHT;

            const j = clamp(Math.round(x / xi), 0, GRID_WIDTH);
            const i = clamp(Math.round(y / yi), 0, GRID_HEIGHT);
            const iFlat = GRID_WIDTH*i + j;
            const itemIndex = itemToInt(item);

            if((item === "rubs" && TERP_MASK.includes(iFlat))
                || (item !== "rubs" && ITEM_MASK.includes(iFlat))) {
                const req = {
                    item: itemIndex,
                    i: iFlat,
                };
                d3_json(
                    HTTP_URL + '/incr',
                    { method: "POST", body: JSON.stringify(req) }
                );
            }

        }
    }, 500), [top, left, item, width, height]);


    const cursorStyle = (isPlacing ? 
        { cursor: `url('${itemToPath(item)}'), auto` } : 
        { cursor: `url('img/raised-hand-emoji.png'), auto` }
    );

    const donationTotal = Object.values(itemTotals).reduce(sum, 0);
    const numberFormatter = new Intl.NumberFormat('en-US');

    return (
        <div ref={divRef} className="testudo-canvas-wrapper">
            <div style={{ width: `${width}px`, height: `${height}px`, ...cursorStyle }}>
            <Stage
                width={width}
                height={height}
                options={{
                    transparent: true,
                    antialias: true,
                    resolution: 1,
                    clearBeforeRender: true
                }}
            >
                <Sprite
                    image="/img/testudo.JPG"
                    x={0}
                    y={0}
                    width={width}
                    height={height}
                    interactive
                    pointerdown={onPointerDown}
                />
                <Container>
                    <HandSprites arr={data.rubs} width={width} height={height} />
                    <DonationSprites data={data} width={width} height={height} />
                </Container>
            </Stage>
            </div>
            <div className="footer">
                <p><Tag>rubs</Tag> <Tag minimal>{numberFormatter.format(rubTotal)}</Tag></p>
                <p><Tag>donations</Tag> <Tag minimal>{numberFormatter.format(donationTotal)}</Tag></p>
            </div>
        </div>
    );
}