---
title: Carry Me Home
slug: carry-me-home
summary: A deliberately hard 2D platformer. You draw the wind yourself with the mouse and let it pull you through the level.
year: 2025/26
role: Programming and sound design
tags:
  - Unity
  - C#
  - Physics
  - Sound design
stack:
  - Unity
  - C#
  - ScriptableObjects
repo: ""
demo: https://drive.google.com/drive/folders/1CQqry5PNj__V8CvP2Zu-ybV9MXhn8mew?usp=drive_link
demoLabel: Download the build
cover: /assets/images/carry-me-home-01.jpg
order: 2
draft: false
---

## The game

Carry Me Home is a stripped back 2D platformer built deliberately with 3D
assets. The world gains depth that way while the controls stay simple. The
model was the rage game principle: mistakes are not cushioned, they are part of
the learning curve. Frustration is allowed, unfairness is not. Every section
should be reliably beatable with enough practice.

It came out of the module "Project 1: Interdisciplinary Project" together with
Moritz Lohmann. I handled the entire technical side in Unity, Moritz the 3D
assets and the level design.

![A level from Carry Me Home: floating islands above water with a castle in the background](/assets/images/carry-me-home-02.jpg)

## Wind you paint yourself

There are no fixed wind zones. Instead you draw the wind. A mouse stroke is
projected onto a plane in the scene, which creates a path with evenly spaced
invisible nodes. Anything whose trigger area reaches those nodes, the player
character as much as movable objects, gets pulled along them. Like a chain of
magnets.

To make this a task rather than a free pass, drawing carries an **energy
budget**. Every metre drawn costs, and the energy refills over time. How long a
line gets becomes a decision made mid jump.

Every tuning value lives in a ScriptableObject rather than in code: node
spacing, pull strength, top speed, how much momentum carries over, how long a
line lives. Balancing happens in the editor instead of the compiler, and
several presets for different levels cost no line of code at all.

![Another part of the level with a rope bridge and a small house](/assets/images/carry-me-home-03.jpg)

## Where it got difficult

The idea takes one sentence to explain. The difficulty sits in the details:
trigger setups, rigidbody behaviour, node order, deleting lines, keeping
momentum on release, and preventing a back and forth between two neighbouring
nodes. Bugs in systems like that are rarely local. They show up as behaviour,
not as an exception.

The mechanic needed several attempts. What helped was testing it early and
often in the actual game feel instead of optimising on paper.

On top came blockers that had nothing to do with my own code. The project hung
on the initial asset database refresh and editor files were corrupted. Cleanly
telling apart whether a problem sits in the code or in the project setup was
the real exercise.

## Two things that stayed

**Physics mechanics run on states, not on values.** What mattered was never how
strong the pull is, but when it starts, when it ends, and what happens to the
momentum afterwards. Clear rules for that did more than any amount of tweaking
numbers.

And: when the editor or the project cache is broken, more code tuning does not
help. Ruling those causes out early saves hours.
