import React, { useRef, useEffect, useState, useCallback } from 'react';
import PubSub from 'pubsub-js';
import { Graphics, BLEND_MODES, Sprite as PixiSprite } from 'pixi.js';
import { Stage, Container, Text, Sprite, useApp } from '@inlet/react-pixi';
import range from 'lodash/range';
import { itemToPath, itemToInt, intToItem } from './utils';
import { HAND_PLACING, ITEMS, EVENT_LOAD, GRID_SIZE, GRID_WIDTH, GRID_HEIGHT, AR } from './constants';

function ItemSprites(props) {
    const {
        arr,
        item,
        width,
        height,
        opacity = 1
    } = props;

    if(!arr) {
        return null;
    }
    const xi = width / GRID_WIDTH;
    const yi = height / GRID_HEIGHT;

    const itemWidth = width/20;
    const itemHeight = itemWidth;
    const itemPath = itemToPath(item);
    
    return range(GRID_HEIGHT).map((i) => (
        range(GRID_WIDTH).map((j) => {
            const iFlat = GRID_WIDTH*i + j;
            const alpha = Math.min(1, opacity*arr[iFlat]);
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
            opacity={0.005}
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
        />
    )));
}

export default function TestudoCanvas(props) {
    const { handState, item } = props;
    const isPlacing = (handState === HAND_PLACING && item);
    const divRef = useRef();
    const [width, setWidth] = useState(null);
    const [height, setHeight] = useState(null);
    const [data, setData] = useState({});

    useEffect(() => {
        const token = PubSub.subscribe(EVENT_LOAD, (msg, arr) => {
            const i = arr[0];
            const item = intToItem(i);
            const data = arr.subarray(1);
            setData(prevData => ({ ...prevData, [item]: data }));
        });
        return () => PubSub.unsubscribe(token);
    }, []);

    const onMount = useCallback((app) => {
        
    }, []);

    useEffect(() => {
        const resizeHandler = () => {
            const { width: divWidth, height: divHeight } = divRef.current.getBoundingClientRect();
            setWidth(divWidth);
            setHeight(divWidth/AR);
        }
        resizeHandler();
        window.addEventListener('resize', resizeHandler);
        return () => window.removeEventListener('resize', resizeHandler);
    }, []);

    const onPointerDown = useCallback((event) => {
        console.log(event);
    })


    const cursorStyle = (isPlacing ? 
        { cursor: `url('${itemToPath(item)}'), auto` } : 
        { cursor: `url('img/raised-hand-emoji.png'), auto` }
    );

    return (
        <div ref={divRef} className="testudo-canvas-wrapper" style={cursorStyle}>
            <Stage
                width={width}
                height={height}
                onMount={onMount}
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
                    <DonationSprites data={data} width={width} height={height} />
                    <HandSprites arr={data.rubs} width={width} height={height} />
                </Container>
            </Stage>
        </div>
    );
}