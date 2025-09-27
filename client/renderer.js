const CONFIG = {
  ARENA_SIZE: 500,
  RENDER_INTERVAL: 16,
  AGENT_HAND_RADIUS: 20,
  AGENT_RADIUS: 40,
  MOVE_SPEED: 2,
  ATTACK_SPEED: 4,
  BASE_HAND_LEN: 75,
  HAND_EXTRA_RANGE: 40,
  HAND_ATTACK_SPEED: 6,
  HAND_COLLISION_DMG: 5,
  BODY_COLLISION_DMG: 20,
  DEFENSE_BLOCK_MULT: 0.3,
  KNOCKBACK_FORCE: 15,
  HAND_SMOOTHING: 0.15,
};

const gameState = {
  canvas: document.getElementById("mainCanvas"),
  ctx: null,
  agents: [],
  damageIndicators: [],
  lastTime: 0,
};

gameState.ctx = gameState.canvas.getContext("2d");

const Utils = {
  toRadians: (deg) => (deg * Math.PI) / 180,

  toDegrees: (rad) => (rad * 180) / Math.PI,

  distance: (a, b) => Math.hypot(a.x - b.x, a.y - b.y),

  normalize: (vx, vy) => {
    const len = Math.hypot(vx, vy);
    return len > 0 ? { x: vx / len, y: vy / len } : { x: 0, y: 0 };
  },

  lerp: (a, b, t) => a + (b - a) * t,

  lerpAngle: (from, to, t) => {
    let diff = to - from;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    return from + diff * t;
  },

  clamp: (value, min, max) => Math.min(Math.max(value, min), max),

  randomRange: (min, max) => Math.random() * (max - min) + min,
};

class Agent {
  constructor(name, x, y, color = "#D9D9D9") {
    this.name = name;
    this.pos = { x, y };
    this.velocity = { x: 0, y: 0 };
    this.rot = 0;
    this.targetRot = 0;
    this.state = 0;
    this.hp = 100;
    this.maxHp = 100;
    this.color = color;
    this.knockbackTimer = 0;
    this.damageFlash = 0;

    this.hands = [
      {
        angle: 15,
        targetAngle: 15,
        len: CONFIG.BASE_HAND_LEN,
        targetLen: CONFIG.BASE_HAND_LEN,
        extending: false,
        retracting: false,
      },
      {
        angle: -15,
        targetAngle: -15,
        len: CONFIG.BASE_HAND_LEN,
        targetLen: CONFIG.BASE_HAND_LEN,
        extending: false,
        retracting: false,
      },
    ];
  }

  update(target, deltaTime) {
    this.updateRotation(target);
    this.updateHands(deltaTime);
    this.updateMovement(target, deltaTime);
    this.updateTimers(deltaTime);
  }

  updateRotation(target) {
    const dx = target.pos.x - this.pos.x;
    const dy = target.pos.y - this.pos.y;
    this.targetRot = Utils.toDegrees(Math.atan2(dy, dx));
    this.rot = Utils.lerpAngle(this.rot, this.targetRot, 0.1);
  }

  updateHands(deltaTime) {
    this.hands.forEach((hand) => {
      // Smooth angle interpolation
      hand.angle = Utils.lerpAngle(
        hand.angle,
        hand.targetAngle,
        CONFIG.HAND_SMOOTHING
      );

      // Smooth length interpolation for attacks
      if (hand.extending) {
        hand.targetLen = CONFIG.BASE_HAND_LEN + CONFIG.HAND_EXTRA_RANGE;
        hand.len = Utils.lerp(hand.len, hand.targetLen, 0.3);

        if (Math.abs(hand.len - hand.targetLen) < 2) {
          hand.extending = false;
          hand.retracting = true;
        }
      } else if (hand.retracting) {
        hand.targetLen = CONFIG.BASE_HAND_LEN;
        hand.len = Utils.lerp(hand.len, hand.targetLen, 0.2);

        if (Math.abs(hand.len - hand.targetLen) < 1) {
          hand.retracting = false;
          this.state = 0; // Return to moving state
        }
      } else {
        hand.len = Utils.lerp(hand.len, hand.targetLen, 0.1);
      }
    });
  }

  updateMovement(target, deltaTime) {
    if (this.knockbackTimer > 0) {
      this.pos.x += this.velocity.x * deltaTime * 0.1;
      this.pos.y += this.velocity.y * deltaTime * 0.1;
      this.velocity.x *= 0.9;
      this.velocity.y *= 0.9;
    } else {
      this.executeMovement(target);
    }

    this.pos.x = Utils.clamp(
      this.pos.x,
      CONFIG.AGENT_RADIUS,
      CONFIG.ARENA_SIZE - CONFIG.AGENT_RADIUS
    );
    this.pos.y = Utils.clamp(
      this.pos.y,
      CONFIG.AGENT_RADIUS,
      CONFIG.ARENA_SIZE - CONFIG.AGENT_RADIUS
    );
  }

  executeMovement(target) {
    const dx = target.pos.x - this.pos.x;
    const dy = target.pos.y - this.pos.y;
    const distance = Utils.distance(this.pos, target.pos);

    let moveX = 0,
      moveY = 0;

    switch (this.state) {
      case 0: // Forward
        if (distance > CONFIG.AGENT_RADIUS * 2.5) {
          const dir = Utils.normalize(dx, dy);
          moveX = dir.x * CONFIG.MOVE_SPEED;
          moveY = dir.y * CONFIG.MOVE_SPEED;
        }
        this.setHandPositions(15, -15);
        break;

      case 1: // Backward
        const backDir = Utils.normalize(-dx, -dy);
        moveX = backDir.x * CONFIG.MOVE_SPEED;
        moveY = backDir.y * CONFIG.MOVE_SPEED;
        this.setHandPositions(15, -15);
        break;

      case 2: // Strafe right
        const rightDir = Utils.normalize(dx, dy);
        moveX = -rightDir.y * CONFIG.MOVE_SPEED;
        moveY = rightDir.x * CONFIG.MOVE_SPEED;
        this.setHandPositions(15, -15);
        break;

      case 3: // Strafe left
        const leftDir = Utils.normalize(dx, dy);
        moveX = leftDir.y * CONFIG.MOVE_SPEED;
        moveY = -leftDir.x * CONFIG.MOVE_SPEED;
        this.setHandPositions(15, -15);
        break;

      case 4: // Left jab
        this.attackWithHand(target, 0);
        break;

      case 5: // Right jab
        this.attackWithHand(target, 1);
        break;

      case 6: // Side attack left
        this.hands[0].targetAngle = -90;
        this.attackWithHand(target, 0);
        break;

      case 7: // Side attack right
        this.hands[1].targetAngle = 90;
        this.attackWithHand(target, 1);
        break;

      case 8: // Defense center
        this.setHandPositions(0, 0);
        break;

      case 9: // Defense right
        this.setHandPositions(-30, -10);
        break;

      case 10: // Defense left
        this.setHandPositions(30, 10);
        break;
    }

    if (moveX || moveY) {
      const newPos = { x: this.pos.x + moveX, y: this.pos.y + moveY };
      const minDistance = CONFIG.AGENT_RADIUS * 2 + 2; // Small buffer to prevent clipping

      // Check for collision with target and prevent movement if too close
      if (Utils.distance(newPos, target.pos) >= minDistance) {
        this.pos.x = newPos.x;
        this.pos.y = newPos.y;
      } else {
        // If agents are overlapping, push them apart
        const currentDistance = Utils.distance(this.pos, target.pos);
        if (currentDistance < minDistance) {
          const pushDir = Utils.normalize(
            this.pos.x - target.pos.x,
            this.pos.y - target.pos.y
          );
          const pushDistance = (minDistance - currentDistance) / 2;
          this.pos.x += pushDir.x * pushDistance;
          this.pos.y += pushDir.y * pushDistance;
        }
      }
    }
  }

  setHandPositions(leftAngle, rightAngle) {
    this.hands[0].targetAngle = leftAngle;
    this.hands[1].targetAngle = rightAngle;
  }

  attackWithHand(target, handIndex) {
    const hand = this.hands[handIndex];
    if (!hand.extending && !hand.retracting) {
      hand.extending = true;
    }

    this.checkHandCollisions(target, handIndex);
  }

  checkHandCollisions(target, handIndex) {
    const hand = this.hands[handIndex];
    const angleRad = Utils.toRadians(this.rot + hand.angle);
    const handPos = {
      x: this.pos.x + Math.cos(angleRad) * hand.len,
      y: this.pos.y + Math.sin(angleRad) * hand.len,
    };

    const bodyDistance = Utils.distance(handPos, target.pos);
    if (
      bodyDistance <= CONFIG.AGENT_RADIUS + CONFIG.AGENT_HAND_RADIUS &&
      hand.extending
    ) {
      this.dealDamage(target, CONFIG.BODY_COLLISION_DMG, handPos);
      hand.extending = false;
      hand.retracting = true;
      this.applyKnockback(target, handPos);
    }

    target.hands.forEach((targetHand, targetHandIndex) => {
      const targetAngleRad = Utils.toRadians(target.rot + targetHand.angle);
      const targetHandPos = {
        x: target.pos.x + Math.cos(targetAngleRad) * targetHand.len,
        y: target.pos.y + Math.sin(targetAngleRad) * targetHand.len,
      };

      const handDistance = Utils.distance(handPos, targetHandPos);
      if (handDistance <= CONFIG.AGENT_HAND_RADIUS * 2 && hand.extending) {
        this.dealDamage(target, CONFIG.HAND_COLLISION_DMG, targetHandPos);
        hand.extending = false;
        hand.retracting = true;

        this.handleHandCollisionResponse(
          target,
          targetHandIndex,
          handPos,
          targetHandPos
        );
      }
    });
  }

  handleHandCollisionResponse(
    target,
    targetHandIndex,
    attackerHandPos,
    defenderHandPos
  ) {
    const dx = defenderHandPos.x - attackerHandPos.x;
    const dy = defenderHandPos.y - attackerHandPos.y;
    const collisionAngle = Utils.toDegrees(Math.atan2(dy, dx));

    const targetHand = target.hands[targetHandIndex];
    const deflectionAngle = collisionAngle - target.rot;

    // Add some randomness to make it more dynamic
    const randomOffset = Utils.randomRange(-30, 30);
    targetHand.targetAngle = deflectionAngle + randomOffset;

    targetHand.targetAngle = Utils.clamp(targetHand.targetAngle, -120, 120);

    const knockbackForce = CONFIG.KNOCKBACK_FORCE * 0.3;
    target.velocity.x +=
      Math.cos(Utils.toRadians(collisionAngle)) * knockbackForce;
    target.velocity.y +=
      Math.sin(Utils.toRadians(collisionAngle)) * knockbackForce;
    target.knockbackTimer = 200;
  }

  applyKnockback(target, impactPos) {
    const dx = target.pos.x - impactPos.x;
    const dy = target.pos.y - impactPos.y;
    const dir = Utils.normalize(dx, dy);

    target.velocity.x += dir.x * CONFIG.KNOCKBACK_FORCE;
    target.velocity.y += dir.y * CONFIG.KNOCKBACK_FORCE;
    target.knockbackTimer = 300;
  }

  dealDamage(target, damage, impactPos) {
    if (target.state >= 8 && target.state <= 10) {
      damage *= CONFIG.DEFENSE_BLOCK_MULT;
    }

    target.hp = Math.max(0, target.hp - damage);
    target.damageFlash = 500;

    this.createDamageIndicator(damage, impactPos);

    console.log(
      `${this.name} hit ${target.name}! Damage: ${damage.toFixed(
        1
      )}, HP left: ${target.hp.toFixed(1)}`
    );

    document.getElementById(
      `agent${target === gameState.agents[0] ? "0" : "1"}hp`
    ).textContent = Math.ceil(target.hp);
  }

  createDamageIndicator(damage, pos) {
    const indicator = document.createElement("div");
    indicator.className = "damage-indicator";
    indicator.textContent = `-${Math.ceil(damage)}`;
    indicator.style.left = pos.x + 10 + "px";
    indicator.style.top = pos.y + 10 + "px";

    document.getElementById("gameContainer").appendChild(indicator);

    setTimeout(() => {
      indicator.remove();
    }, 1000);
  }

  updateTimers(deltaTime) {
    if (this.knockbackTimer > 0) {
      this.knockbackTimer -= deltaTime;
    }
    if (this.damageFlash > 0) {
      this.damageFlash -= deltaTime;
    }
  }

  draw(ctx, target) {
    this.drawBody(ctx);
    this.drawHands(ctx, target);
  }

  drawBody(ctx) {
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, CONFIG.AGENT_RADIUS, 0, 2 * Math.PI);

    if (this.damageFlash > 0) {
      const flashIntensity = Math.sin(this.damageFlash * 0.05) * 0.5 + 0.5;
      ctx.fillStyle = `rgb(${255 * flashIntensity + 217 * (1 - flashIntensity)
        }, ${217 * (1 - flashIntensity)}, ${217 * (1 - flashIntensity)})`;
    } else {
      ctx.fillStyle = this.color;
    }

    ctx.fill();
  }

  drawHealthBar(ctx) {
    const barWidth = CONFIG.AGENT_RADIUS * 1.5;
    const barHeight = 6;
    const barX = this.pos.x - barWidth / 2;
    const barY = this.pos.y - CONFIG.AGENT_RADIUS - 15;

    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);

    const healthPercent = this.hp / this.maxHp;
    const healthColor =
      healthPercent > 0.5 ? "lime" : healthPercent > 0.25 ? "yellow" : "red";
    ctx.fillStyle = healthColor;
    ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
  }

  drawHands(ctx, target) {
    this.hands.forEach((hand) => {
      const angleRad = Utils.toRadians(this.rot + hand.angle);
      let handPos = {
        x: this.pos.x + Math.cos(angleRad) * hand.len,
        y: this.pos.y + Math.sin(angleRad) * hand.len,
      };

      const distanceToTarget = Utils.distance(handPos, target.pos);
      if (distanceToTarget < CONFIG.AGENT_RADIUS + CONFIG.AGENT_HAND_RADIUS) {
        const directionToHand = Utils.normalize(
          handPos.x - target.pos.x,
          handPos.y - target.pos.y
        );
        handPos.x =
          target.pos.x +
          directionToHand.x *
          (CONFIG.AGENT_RADIUS + CONFIG.AGENT_HAND_RADIUS - 2);
        handPos.y =
          target.pos.y +
          directionToHand.y *
          (CONFIG.AGENT_RADIUS + CONFIG.AGENT_HAND_RADIUS - 2);
      }

      ctx.beginPath();
      ctx.moveTo(this.pos.x, this.pos.y);
      ctx.lineTo(handPos.x, handPos.y);
      ctx.strokeStyle = "rgba(190, 0, 0, 0.5)";
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(handPos.x, handPos.y, CONFIG.AGENT_HAND_RADIUS, 0, 2 * Math.PI);
      ctx.fillStyle = hand.extending || hand.retracting ? "#ff4444" : "#be0000";
      ctx.fill();

      if (hand.extending || hand.retracting) {
        ctx.beginPath();
        ctx.arc(
          handPos.x,
          handPos.y,
          CONFIG.AGENT_HAND_RADIUS + 5,
          0,
          2 * Math.PI
        );
        ctx.fillStyle = "rgba(255, 68, 68, 0.3)";
        ctx.fill();
      }
    });
  }
}

class Game {
  constructor() {
    this.agents = [
      new Agent("Agent0", CONFIG.AGENT_RADIUS, CONFIG.AGENT_RADIUS, "#4CAF50"),
      new Agent(
        "Agent1",
        CONFIG.ARENA_SIZE - CONFIG.AGENT_RADIUS,
        CONFIG.ARENA_SIZE - CONFIG.AGENT_RADIUS,
        "#2196F3"
      ),
    ];

    gameState.agents = this.agents;
    this.lastStateChange = 0;
  }

  update(currentTime, deltaTime) {
    if (currentTime - this.lastStateChange > 2000) {
      this.decideStates();
      this.lastStateChange = currentTime;
    }

    this.agents.forEach((agent, index) => {
      const target = this.agents[1 - index];
      agent.update(target, deltaTime);
    });

    if (this.agents[0].hp <= 0 || this.agents[1].hp <= 0) {
      this.handleGameOver();
    }
  }

  decideStates() {
    this.agents.forEach((agent) => {
      const oldState = agent.state;
      agent.state = Math.floor(Math.random() * 11);

      if (oldState >= 4 && oldState <= 7 && agent.state < 4) {
        agent.hands[0].targetAngle = 15;
        agent.hands[1].targetAngle = -15;
      }

      if (agent.state === 4) {
        agent.hands[0].extending = true;
        agent.hands[0].retracting = false;
      }
      if (agent.state === 5) {
        agent.hands[1].extending = true;
        agent.hands[1].retracting = false;
      }
      if (agent.state === 6) {
        agent.hands[0].targetAngle = -90;
        agent.hands[0].extending = true;
        agent.hands[0].retracting = false;
      }
      if (agent.state === 7) {
        agent.hands[1].targetAngle = 90;
        agent.hands[1].extending = true;
        agent.hands[1].retracting = false;
      }
    });
  }

  handleGameOver() {
    const winner = this.agents[0].hp > 0 ? this.agents[0] : this.agents[1];
    console.log(`Game Over! ${winner.name} wins!`);

    setTimeout(() => {
      this.agents[0].pos = { x: CONFIG.AGENT_RADIUS, y: CONFIG.AGENT_RADIUS };
      this.agents[0].hp = this.agents[0].maxHp;
      this.agents[0].damageFlash = 0;
      this.agents[0].knockbackTimer = 0;
      this.agents[0].state = 0;
      this.agents[0].velocity = { x: 0, y: 0 };

      this.agents[1].pos = {
        x: CONFIG.ARENA_SIZE - CONFIG.AGENT_RADIUS,
        y: CONFIG.ARENA_SIZE - CONFIG.AGENT_RADIUS,
      };
      this.agents[1].hp = this.agents[1].maxHp;
      this.agents[1].damageFlash = 0;
      this.agents[1].knockbackTimer = 0;
      this.agents[1].state = 0;
      this.agents[1].velocity = { x: 0, y: 0 };

      this.agents.forEach((agent) => {
        agent.hands[0].angle = 15;
        agent.hands[0].targetAngle = 15;
        agent.hands[0].len = CONFIG.BASE_HAND_LEN;
        agent.hands[0].targetLen = CONFIG.BASE_HAND_LEN;
        agent.hands[0].extending = false;
        agent.hands[0].retracting = false;

        agent.hands[1].angle = -15;
        agent.hands[1].targetAngle = -15;
        agent.hands[1].len = CONFIG.BASE_HAND_LEN;
        agent.hands[1].targetLen = CONFIG.BASE_HAND_LEN;
        agent.hands[1].extending = false;
        agent.hands[1].retracting = false;
      });

      document.getElementById("agent0hp").textContent = "100";
      document.getElementById("agent1hp").textContent = "100";
    }, 3000);
  }

  render(ctx) {
    const gradient = ctx.createLinearGradient(0, 0, 0, CONFIG.ARENA_SIZE);
    gradient.addColorStop(0, "#2c3e50");
    gradient.addColorStop(1, "#34495e");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CONFIG.ARENA_SIZE, CONFIG.ARENA_SIZE);

    ctx.strokeStyle = "#ecf0f1";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, CONFIG.ARENA_SIZE - 2, CONFIG.ARENA_SIZE - 2);

    ctx.beginPath();
    ctx.moveTo(CONFIG.ARENA_SIZE / 2, 0);
    ctx.lineTo(CONFIG.ARENA_SIZE / 2, CONFIG.ARENA_SIZE);
    ctx.strokeStyle = "rgba(236, 240, 241, 0.3)";
    ctx.lineWidth = 1;
    ctx.stroke();

    this.agents.forEach((agent) => agent.drawBody(ctx));

    this.agents.forEach((agent, index) => {
      const target = this.agents[1 - index];
      agent.drawHands(ctx, target);
    });

    this.agents.forEach((agent) => agent.drawHealthBar(ctx));
  }
}

const game = new Game();
let lastTime = 0;

function gameLoop(currentTime) {
  const deltaTime = currentTime - lastTime;
  lastTime = currentTime;

  game.update(currentTime, deltaTime);
  game.render(gameState.ctx);

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);

function sendCoachMessage() {
  const textarea = document.getElementById("coachInput");
  const message = textarea.value.trim();

  if (message) {
    addChatMessage(1, message);
    textarea.value = "";

    console.log(`Your coaching instructions:`, message);
  }
}

function addChatMessage(coachNumber, message) {
  const chatMessages = document.getElementById("chatMessages");
  const messageDiv = document.createElement("div");
  messageDiv.className = `message coach${coachNumber}`;

  const headerDiv = document.createElement("div");
  headerDiv.className = "message-header";
  const coachName = coachNumber === 1 ? "You (Agent 0)" : "Opponent (Agent 1)";
  headerDiv.textContent = `${coachName} - ${new Date().toLocaleTimeString()}`;

  const contentDiv = document.createElement("div");
  contentDiv.textContent = message;

  messageDiv.appendChild(headerDiv);
  messageDiv.appendChild(contentDiv);
  chatMessages.appendChild(messageDiv);

  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function clearChat() {
  const chatMessages = document.getElementById("chatMessages");
  chatMessages.innerHTML = ``;
}

document.getElementById("coachInput").addEventListener("keydown", function(e) {
  if (e.key === "Enter" && e.ctrlKey) {
    sendCoachMessage();
    e.preventDefault();
  }
});
