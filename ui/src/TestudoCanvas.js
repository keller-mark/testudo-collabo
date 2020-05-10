import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Tag, ProgressBar, Toaster, Position, Intent } from "@blueprintjs/core";
import PubSub from 'pubsub-js';
import { json as d3_json } from 'd3-fetch';
import { Stage, Container, Sprite } from '@inlet/react-pixi';
import range from 'lodash/range';
import debounce from 'lodash/debounce';
import clamp from 'lodash/clamp';
import { itemToPath, itemToInt, intToItem, sum, mobileAndTabletCheck } from './utils';
import { ITEMS, HAND_PLACING, EVENT_LOAD, GRID_WIDTH, GRID_HEIGHT, 
    AR, HTTP_URL, ITEM_MASK, RUB_MASK, TIME_LIMIT } from './constants';

function HandSprites(props) {
    const { arr, width, height, mask } = props;
    
    const item = 'raised-hand-emoji';
    const logScaleAlpha = true;
    const opacity = 0.5;
    const scale = 1;

    if(!arr || !mask) {
        return [];
    }
    const xi = width / GRID_WIDTH;
    const yi = height / GRID_HEIGHT;

    const itemSize = scale*width/20;
    const itemPath = itemToPath(item);

    return Array.from(arr).map((count, iMask) => {
        const iFlat = mask[iMask];
        const j = Math.floor(iFlat / GRID_WIDTH);
        const i = iFlat % GRID_WIDTH;
        if(count === 0) {
            return null;
        }
        if(logScaleAlpha) {
            count = Math.log10(count+1);
        }
        const alpha = clamp(opacity*count, 0, 1);
        return (
            <Sprite
                key={`${item}-${iMask}`}
                image={itemPath}
                x={i*xi}
                y={j*yi}
                width={itemSize}
                height={itemSize}
                alpha={alpha}
            />
        );
    }).filter(Boolean);
}

function DonationSprites(props) {
    const { data, width, height, mask } = props;
    const logScaleAlpha = false;
    const opacity = 1;
    const scale = 2;

    if(!data || !mask) {
        return [];
    }
    const xi = width / GRID_WIDTH;
    const yi = height / GRID_HEIGHT;

    const itemSize = scale*width/20;

    return range(ITEM_MASK.length).map((iMask) => {
        const iFlat = mask[iMask];
        const j = Math.floor(iFlat / GRID_WIDTH);
        const i = iFlat % GRID_WIDTH;

        const counts = ITEMS.map((item) => {
            if(item === "rubs" || !data[item] || data[item][iMask] === 0) {
                return null;
            }
            return [item, data[item][iMask]];
        }).filter(Boolean).sort((a, b) => (a[1] - b[1]));

        return counts.map(([item, count]) => {
            const itemPath = itemToPath(item);

            if(logScaleAlpha) {
                count = Math.log10(count+1);
            }
            const alpha = clamp(opacity*count, 0, 1);
            return (
                <Sprite
                    key={`${item}-${iMask}`}
                    image={itemPath}
                    x={i*xi}
                    y={j*yi}
                    width={itemSize}
                    height={itemSize}
                    alpha={alpha}
                />
            );
        });
    });
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
    const [secondsRemaining, setSecondsRemaining] = useState(0);

    useEffect(() => {
        const token = PubSub.subscribe(EVENT_LOAD, (msg, arr) => {
            const i = arr[0];
            const item = intToItem(i);
            const data = arr.subarray(1);

            // Store the new array.
            setData(prevData => ({ ...prevData, [item]: data }));

            // Compute sum.
            const total = data.reduce(sum, 0);
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

    useEffect(() => {
        if(secondsRemaining > 0) {
            setTimeout(() => setSecondsRemaining(oldVal => oldVal - 0.25), 250);
        }
    }, [secondsRemaining])

    const onPointerDown = useCallback(debounce((event) => {
        const origEvent = event.data.originalEvent;
        const toast = Toaster.create({position: Position.TOP }, document.body);
        if(origEvent) {
            if(secondsRemaining) {
                toast.show({ message: `Please wait ${TIME_LIMIT} seconds between rubs and donations.` });
                return;
            }
            const itemSize = 2*width/20;

            const clientX = (origEvent.clientX ? origEvent.clientX : origEvent.pageX);
            const clientY = (origEvent.clientY ? origEvent.clientY : origEvent.pageY);
            
            const desktopOffset = (isPlacing ? - itemSize/2 : itemSize/2);
            const isMobile = mobileAndTabletCheck();
            
            const x = clientX - left + (isMobile ? 0 : desktopOffset);
            const y = clientY - top + (isMobile ? 0 : desktopOffset);

            const xi = width / GRID_WIDTH;
            const yi = height / GRID_HEIGHT;

            const j = clamp(Math.round(x / xi), 0, GRID_WIDTH);
            const i = clamp(Math.round(y / yi), 0, GRID_HEIGHT);
            let iFlat = GRID_WIDTH*i + j;

            const itemIndex = itemToInt(item);

            let iMask;

            if(item === "rubs") {
                iMask = RUB_MASK.indexOf(iFlat);
                if(iMask < 0) {
                    toast.show({ message: "You rubbed a donation or the air. Please only rub Testudo." });
                    return;
                }
            } else {
                iMask = ITEM_MASK.indexOf(iFlat);
                if(iMask < 0) {
                    toast.show({ message: "Please place donations around Testudo, not on top or in the air." });
                    return;
                }
            }

            const req = {
                item: itemIndex,
                i: iMask,
            };
            d3_json(
                HTTP_URL + '/incr',
                { method: "POST", body: JSON.stringify(req) }
            );
            setSecondsRemaining(TIME_LIMIT);

            toast.show({ message: `Testudo thanks you for the ${item}.`, intent: Intent.SUCCESS });
        }
    }, 500, { leading: true }), [top, left, item, width, height, secondsRemaining]);


    const cursorStyle = (isPlacing ? 
        { cursor: `crosshair` } : 
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
                    <HandSprites arr={data.rubs} width={width} height={height} mask={RUB_MASK} />
                    <DonationSprites data={data} width={width} height={height} mask={ITEM_MASK} />
                </Container>
            </Stage>
            </div>
            <div className="footer">
                <p><Tag>rubs</Tag> <Tag minimal>{numberFormatter.format(rubTotal)}</Tag></p>
                <p><Tag>donations</Tag> <Tag minimal>{numberFormatter.format(donationTotal)}</Tag></p>
            </div>
            {secondsRemaining > 0 ? (<ProgressBar value={1 - secondsRemaining / TIME_LIMIT} />) : null}
            
        </div>
    );
}
