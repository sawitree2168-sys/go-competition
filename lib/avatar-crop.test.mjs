import test from "node:test";
import assert from "node:assert/strict";
import {avatarCropRect} from "./avatar-crop.mjs";
test("square image uses full frame at 100%",()=>assert.deepEqual(avatarCropRect(500,500),{x:0,y:0,width:500,height:500}));
test("portrait is centered",()=>assert.deepEqual(avatarCropRect(400,800),{x:0,y:200,width:400,height:400}));
test("zoom crops smaller source area",()=>assert.deepEqual(avatarCropRect(400,400,2),{x:100,y:100,width:200,height:200}));
test("drag is clamped to image boundaries",()=>{const c=avatarCropRect(400,400,2,10000,-10000);assert.equal(c.x,0);assert.equal(c.y,200)});
test("invalid dimensions rejected",()=>assert.throws(()=>avatarCropRect(0,500),/invalid_image_dimensions/));
