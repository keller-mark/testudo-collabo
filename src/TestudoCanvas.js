import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Graphics, BLEND_MODES, Sprite as PixiSprite } from 'pixi.js';
import { Stage, Container, Text, Sprite, useApp } from '@inlet/react-pixi';
import range from 'lodash/range';
import { HAND_PLACING, itemToPath, items } from './constants';

const ar = 1674/935;
const gridWidth = 40;
const gridHeight = Math.floor(gridWidth/ar);

function ItemSprites(props) {
    const { item, width, height, factor = 1 } = props;
    const xi = width / gridWidth;
    const yi = height / gridHeight;

    const itemWidth = width/20;
    const itemHeight = itemWidth;
    
    return range(gridWidth).map((i) => (
        range(gridHeight).map((j) => (
            <Sprite
                image={itemToPath(item)}
                x={i*xi}
                y={j*yi}
                width={itemWidth}
                height={itemHeight}
                alpha={0.0004*Math.random()*1000/factor}
            />
        ))
    ));
}

function HandSprites(props) {
    const item = 'raised-hand-emoji';

    return (
        <ItemSprites item={item} {...props} />
    );
}

function DonationSprites(props) {
    return (items.map(item => (
        <ItemSprites item={item} factor={2} {...props} />
    )));
}

export default function TestudoCanvas(props) {
    const { handState, item } = props;
    const isPlacing = (handState === HAND_PLACING && item);
    const divRef = useRef();
    const [width, setWidth] = useState(null);
    const [height, setHeight] = useState(null);

    const onMount = useCallback((app) => {
        
    }, []);

    useEffect(() => {
        const resizeHandler = () => {
            const { width: divWidth, height: divHeight } = divRef.current.getBoundingClientRect();
            setWidth(divWidth);
            setHeight(divWidth/ar);
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
                    {isPlacing ? <DonationSprites width={width} height={height} /> : <HandSprites width={width} height={height} />}
                </Container>
            </Stage>
        </div>
    );
}