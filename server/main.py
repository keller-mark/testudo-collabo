
from starlette.applications import Starlette
from starlette.websockets import WebSocketDisconnect
from starlette.responses import JSONResponse
from websockets.exceptions import ConnectionClosed
from jsonschema import validate
import uvicorn
import os
import json
import numpy as np
import asyncio
import aioredis
import itertools

app = Starlette(debug=bool(os.environ.get('DEBUG', '')))
r = None

async def get_r():
    global r
    if r == None:
        r = await aioredis.create_redis_pool(
            ('redis', 6379),
            db=0, 
            password=os.environ.get('REDIS_PASS', '')
        )
    return r

HEADERS = { 'Access-Control-Allow-Origin': '*' }

# Lengths of the mask arrays
RUB_MASK_SIZE = 523
ITEM_MASK_SIZE = 588

# Item indices, 99 corresponds to the "rubs" item.
ITEMS = [99] + list(range(20))
# Dtype for numpy structured array.
DTYPE = [('index', np.uint16), ('count', np.uint16)]


async def get_item_counts(r, item, to_bytes=True):
    x = await r.zrange(item, 0, -1, withscores=True, encoding=None)
    x = np.sort(np.array(x, dtype=DTYPE), order='index')['count'][:]
    x = np.concatenate((np.array([item], dtype=np.uint16), x)) # prepend the item index
    if to_bytes:
        return x.tobytes()
    else:
        return x.tolist()

async def listen(websocket):
    r = await get_r()
    await websocket.accept()
    try:
        # Confirm that this was the initialization message.
        init_msg = await websocket.receive_json()
        assert(init_msg["type"] == "init")

        # On initialization, respond with all item arrays.
        for item in ITEMS:
            data = await get_item_counts(r, item)
            try:
                await websocket.send_bytes(data)
            except ConnectionClosed:
                return

        res = await r.subscribe('channel:1')
        ch = res[0]
        assert(isinstance(ch, aioredis.Channel))

        async for ch_msg in ch.iter():
            data = await get_item_counts(r, ch_msg)
            try:
                await websocket.send_bytes(data)
            except ConnectionClosed:
                return
    except Exception as e:
        return websocket.close()


# Routes
@app.websocket_route('/rub-or-donate')
async def route_listen(websocket):
  await listen(websocket)

@app.route('/init', methods=['GET'])
async def route_init(request):
  r = await get_r()
  for item in ITEMS:
    print(item)
    if item == 99:
        x = list(zip([0]*RUB_MASK_SIZE, list(range(RUB_MASK_SIZE))))
    else:
        x = list(zip([0]*ITEM_MASK_SIZE, list(range(ITEM_MASK_SIZE))))
    await r.zadd(item, *itertools.chain.from_iterable(x))
    await r.publish('channel:1', item)
  return JSONResponse(
    content={"status": "Initialized!"},
    status_code=200,
    headers=HEADERS
  )

@app.route('/get/{item:int}', methods=['GET'])
async def route_get(request):
  r = await get_r()

  item = int(request.path_params['item'])
  assert(item in ITEMS)
  x = await get_item_counts(r, item, to_bytes=False)
  
  return JSONResponse(
    content=x,
    status_code=200,
    headers=HEADERS
  )

schema_incr = {
  "type": "object",
  "properties": {
    "item": {"type": "integer"},
    "i": {"type": "integer"}
  }
}
@app.route('/incr', methods=['POST'])
async def route_incr(request):
  req = await request.json()
  validate(req, schema_incr)
  item = int(req["item"])
  i = int(req["i"])
  assert(item in ITEMS)
  if item == 99:
    assert(0 <= i < RUB_MASK_SIZE)
  else:
    assert(0 <= i < ITEM_MASK_SIZE)

  r = await get_r()
  await r.zincrby(item, 1, i)
  await r.publish('channel:1', item)
  return JSONResponse(
    content={"status": "Success!"},
    status_code=200,
    headers=HEADERS
  )

if __name__ == '__main__':
    uvicorn.run(app, host='0.0.0.0', port=int(os.environ.get('PORT', 8000)))