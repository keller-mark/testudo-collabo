
from starlette.applications import Starlette
from starlette.websockets import WebSocketDisconnect
from starlette.responses import JSONResponse
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

ITEMS = list(range(20)) + [99] # itemm indices
GRID_SIZE = 50*50
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
        init_msg = await websocket.receive_json()
        assert(init_msg["type"] == "init")
    except Exception as e:
        print(str(e))
        return websocket.close()

    res = await r.subscribe('channel:1')
    ch = res[0]
    assert isinstance(ch, aioredis.Channel)

    async for ch_msg in ch.iter():
        data = await get_item_counts(r, ch_msg)
        try:
            await websocket.send_bytes(data)
            #await websocket.receive_json()
        except WebSocketDisconnect:
            print("websocket disconnect")


# Routes
@app.websocket_route('/rub-or-donate')
async def route_listen(websocket):
  await listen(websocket)

@app.route('/init', methods=['GET'])
async def route_init(request):
  r = await get_r()
  for item in ITEMS:
    x = list(zip([0]*GRID_SIZE, [ i for i in range(GRID_SIZE) ]))
    print(x[0:4])
    await r.zadd(item, *itertools.chain.from_iterable(x))
  return JSONResponse(
    content={"status": "Initialized!"},
    status_code=200,
    headers=HEADERS
  )

@app.route('/get', methods=['GET'])
async def route_get(request):
  r = await get_r()
  x = await get_item_counts(r, 99, to_bytes=False)
  
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
  assert(0 <= i < GRID_SIZE)

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