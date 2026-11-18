import test from 'node:test';
import assert from 'node:assert/strict';
import { athletePhotoSource, DEFAULT_ATHLETE_PHOTO, sharpPhotoWidth } from './athlete-photo.mjs';
test('historic placeholders use vector artwork, without changing real photo URLs', () => {
 assert.equal(athletePhotoSource(null), DEFAULT_ATHLETE_PHOTO);
 assert.equal(athletePhotoSource('https://example.com/avatars/go-approved-original.webp?v=1'), DEFAULT_ATHLETE_PHOTO);
 const original='https://example.com/storage/athlete.webp?token=abc';
 assert.equal(athletePhotoSource(original), original);
});
test('small photos are constrained by actual pixel density, including high density phones', () => {
 assert.equal(sharpPhotoWidth(128, 1),128);
 assert.equal(sharpPhotoWidth(128, 3),42);
 assert.equal(sharpPhotoWidth(1280, 2),640);
 assert.equal(sharpPhotoWidth(1, 3),1);
});
