---
title: Shardcore
slug: shardcore
summary: A drill ship breaks low poly planets apart block by block, all the way to the core. A 3D adaptation of To The Core with its own skill tree and thirteen worlds.
year: 2026
date: 2026-10
role: Solo project
stack:
  - Unity 6
  - C#
  - URP
  - Input System
  - butler
repo: ""
demo: https://willmuth.itch.io/shardcore-demo
demoLabel: Demo on itch.io
thumb: /assets/images/shardcore-cover.jpg
cover: /assets/images/shardcore-titel.jpg
gallery:
  - /assets/images/shardcore-01.jpg
  - /assets/images/shardcore-02.jpg
  - /assets/images/shardcore-03.jpg
  - /assets/images/shardcore-04.jpg
  - /assets/images/shardcore-05.jpg
  - /assets/images/shardcore-06.jpg
draft: false
---

## What it is

You fly a drill ship into a low poly planet, break it apart block by block and
haul the ore back home. The ore goes into a large skill tree, then you fly
again and get a little deeper every time. Crack the core and you set course for
the next world.

Thirteen worlds make up the solar system: a rusty rock, jungles and ice worlds,
a seething sun, a shattered star and a black hole at the end. Every planet is
built from thousands of blocks, layer by layer down to its core. Crack a core
and its world comes back tougher and richer.

## From To The Core to Shardcore

The starting point was **To The Core**, a 2D incremental game by SomethingExtra
from 2023. Shardcore carries its idea into three dimensions: the planet is made
of many small cells that break one by one.

Before anything of its own could happen, it had to be clear what the original
actually does. That turned into a collection of facts from the fan wiki, Steam
guides and around 160 discussion threads. Every number in it carries a mark:
confirmed on a screenshot, taken from a source, extrapolated from a formula or
only assumed.

After that the game got an identity of its own: its own title, its own names
for planets, equipment and weapons, and its own skill tree with its own values.
"Home" became Rustbell, "Blackhole" became The Maw.

## A tree that shows the goal

The skill tree is round. The core sits in the middle, six branches grow outward
as sectors, and every ring is a depth. So the picture alone shows what the game
is about: **to the core.**

The branches are split by purpose rather than by the resource you pay with:
drill head, hull, reactor, yield, arsenal and workshop, over 150 nodes in total.
Five long term nodes with 100 levels each keep farming worthwhile on every
planet.

The tree lives in the project as a table. A generator builds the game data from
it, and the round layout works itself out. A new node needs no coordinates.

## Balance from a report

A menu entry in the editor writes a balance report. For every planet it lists
what a hit does and costs when all nodes up to that point are affordable, half
or fully upgraded.

Comparing against the inherited tree changed three formulas:

- The crit factor used to be shown only. Now it works.
- Electricity grew with the charge, in places beyond a thousandfold. Now it
  gives fixed percentages while there is charge.
- Collected cores added their damage flat and barely mattered. Now they act as
  a multiplier.

The calculation before the rebuild showed the difference most clearly at full
upgrade. In the old tree a fully upgraded ship was 100 to 2,000 times stronger
than an affordable one, in the new one at most 12 times. Farming still pays off,
but it no longer lets you skip whole planets.

## Playable for more people

The accessibility settings offer colour filters for protanopia, deuteranopia
and tritanopia, text in three sizes, high contrast, captions for important
sounds with a direction arrow, fewer light flashes, a calm camera without shake
and a game speed between 50 and 100 percent.

Every menu works without a mouse, by keyboard or gamepad. Common controllers
work even when plugged in or out mid game, and the button hints then show the
matching button. The game is available in German and English.

## How it was made

The code and texts of Shardcore were made with the AI Claude, the music with
Suno. The itch.io page says so as well.

Building and publishing happens straight from Unity: a menu entry builds the
demo or the full version with the next version number, uploads only the changes
to itch.io via butler and tags the state in Git.

The free demo contains the first two worlds.
