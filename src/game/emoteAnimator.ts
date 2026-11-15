import { CharacterRig } from './models';

/**
 * Pure zero-allocation procedural 3D emote pose evaluator for CharacterRig.
 * Used identically across LobbyScene, BattleRoyaleEngine (local + remote players).
 */
export function applyEmotePose(
  rig: CharacterRig,
  emoteId: string,
  elapsed: number,
  duration: number
): void {
  const t = elapsed;
  const progress = Math.min(1, elapsed / Math.max(0.1, duration));

  // Reset baseline transforms before applying emote-specific offsets
  rig.bodyPivot.rotation.set(0, 0, 0);
  rig.bodyPivot.position.set(0, 0, 0);
  rig.torso.position.set(0, 0.9, 0);
  rig.torso.rotation.set(0, 0, 0);
  rig.head.rotation.set(0, 0, 0);
  rig.leftLeg.rotation.set(0, 0, 0);
  rig.rightLeg.rotation.set(0, 0, 0);

  if (emoteId === 'hello') {
    // Friendly wave + slight head nod
    const wave = Math.sin(t * 9.5) * 0.45;
    rig.rightArm.rotation.set(-2.4, 0.1, -0.45 + wave);
    rig.leftArm.rotation.set(-0.2, 0.1, 0.12);
    rig.head.rotation.x = Math.sin(t * 4.5) * 0.1;
    rig.torso.rotation.y = 0.12;
  } else if (emoteId === 'booyah') {
    // Victory hop + double fist pump
    const hop = Math.abs(Math.sin(t * 6.5)) * 0.22;
    const pump = Math.sin(t * 13) * 0.28;
    rig.bodyPivot.position.y = hop;
    rig.rightArm.rotation.set(-2.6 + pump, 0.15, -0.25);
    rig.leftArm.rotation.set(-2.6 - pump, -0.15, 0.25);
    rig.leftLeg.rotation.x = -hop * 1.4;
    rig.rightLeg.rotation.x = -hop * 1.4;
    rig.head.rotation.x = -0.18;
    rig.skillAuraGroup.visible = true;
    rig.skillAuraGroup.rotation.y = t * 4.0;
  } else if (emoteId === 'dab') {
    // Classic sharp diagonal dab freeze + bounce
    const bounce = Math.sin(t * 6) * 0.04;
    rig.bodyPivot.position.y = bounce;
    rig.torso.rotation.set(0.15, 0.35, -0.18);
    rig.head.rotation.set(0.35, 0.55, 0.15);
    rig.rightArm.rotation.set(-1.35, 0.85, -0.25);
    rig.leftArm.rotation.set(-2.2, -0.2, 1.05);
    rig.leftLeg.rotation.z = -0.15;
    rig.rightLeg.rotation.z = 0.18;
  } else if (emoteId === 'lol') {
    // Belly laugh rocking + pointing forward
    const laugh = Math.sin(t * 15) * 0.14;
    rig.torso.rotation.x = 0.22 + laugh * 0.6;
    rig.head.rotation.x = -0.22 + laugh;
    rig.head.rotation.y = Math.sin(t * 7) * 0.22;
    rig.rightArm.rotation.set(-1.35 + laugh * 0.5, -0.1, 0);
    rig.leftArm.rotation.set(-0.9, 0.8, 0.35);
    rig.leftLeg.rotation.x = -0.12;
    rig.rightLeg.rotation.x = 0.1;
  } else if (emoteId === 'pushup') {
    // Drop horizontal and perform rapid push-up reps
    const rep = (Math.sin(t * 7.2) + 1) * 0.5;
    rig.bodyPivot.rotation.x = 1.38;
    rig.bodyPivot.position.y = 0.22 + rep * 0.18;
    rig.bodyPivot.position.z = -0.4;
    rig.head.rotation.x = -0.85;
    rig.rightArm.rotation.set(-1.45 - rep * 0.35, 0, -0.25);
    rig.leftArm.rotation.set(-1.45 - rep * 0.35, 0, 0.25);
  } else if (emoteId === 'heart') {
    // Kneeling bow + extending radiant heart/rose pose
    rig.bodyPivot.position.y = -0.28;
    rig.leftLeg.rotation.x = -1.15;
    rig.rightLeg.rotation.x = 0.95;
    rig.torso.rotation.x = 0.18;
    rig.head.rotation.x = 0.12;
    const pulse = Math.sin(t * 4.5) * 0.08;
    rig.rightArm.rotation.set(-1.4 + pulse, 0.25, 0.05);
    rig.leftArm.rotation.set(-0.7, 0.45, 0.2);
    rig.skillAuraGroup.visible = true;
    rig.skillAuraGroup.rotation.y = t * 2.5;
  } else if (emoteId === 'moonwalk') {
    // Smooth backwards groove & arm swing
    const step = Math.sin(t * 8.5);
    rig.bodyPivot.position.z = Math.sin(progress * Math.PI) * -0.45;
    rig.bodyPivot.position.y = Math.abs(step) * 0.05;
    rig.torso.rotation.y = step * 0.25;
    rig.head.rotation.y = -step * 0.25;
    rig.head.rotation.x = 0.12;
    rig.leftLeg.rotation.x = step * 0.52;
    rig.rightLeg.rotation.x = -step * 0.52;
    rig.rightArm.rotation.set(-0.8 + step * 0.5, 0, -0.25);
    rig.leftArm.rotation.set(-0.8 - step * 0.5, 0, 0.25);
  } else if (emoteId === 'draco_flex') {
    // Power-up flex with spinning cyan aura
    const flex = Math.sin(t * 5.0) * 0.15;
    rig.bodyPivot.position.y = 0.05 + Math.abs(flex) * 0.25;
    rig.torso.rotation.y = Math.sin(t * 2.5) * 0.4;
    rig.rightArm.rotation.set(-1.75 + flex, -0.45, -0.55);
    rig.leftArm.rotation.set(-1.75 + flex, 0.45, 0.55);
    rig.leftLeg.rotation.z = -0.16;
    rig.rightLeg.rotation.z = 0.16;
    rig.skillAuraGroup.visible = true;
    rig.skillAuraGroup.rotation.y = t * 6.0;
  } else if (emoteId === 'flag') {
    // Slam flag into ground + heroic chest out
    const slam = Math.min(1, t * 2.4);
    const armPitch = slam < 0.5 ? -2.8 : -1.25;
    rig.bodyPivot.position.y = slam < 0.5 ? 0.16 * (1 - slam * 2) : 0;
    rig.torso.rotation.x = slam < 0.5 ? -0.15 : 0.08;
    rig.rightArm.rotation.set(armPitch, -0.1, -0.2);
    rig.leftArm.rotation.set(-0.35, 0.2, 0.3);
    rig.leftLeg.rotation.x = -0.22;
    rig.rightLeg.rotation.x = 0.22;
    rig.skillAuraGroup.visible = true;
    rig.skillAuraGroup.rotation.y = t * 3.2;
  } else if (emoteId === 'throne') {
    // Royal hover seated throne pose with golden aura
    rig.bodyPivot.position.y = 0.14 + Math.sin(t * 3.0) * 0.04;
    rig.leftLeg.rotation.x = -1.25;
    rig.leftLeg.rotation.z = -0.12;
    rig.rightLeg.rotation.x = -1.05;
    rig.rightLeg.rotation.z = 0.12;
    rig.torso.rotation.x = -0.1;
    rig.rightArm.rotation.set(-0.95, 0.65, 0.35);
    rig.leftArm.rotation.set(-0.95, -0.65, -0.35);
    rig.head.rotation.x = 0.08;
    rig.skillAuraGroup.visible = true;
    rig.skillAuraGroup.rotation.y = t * 2.0;
  }
}

export function resetEmoteRigBase(rig: CharacterRig): void {
  rig.bodyPivot.rotation.set(0, 0, 0);
  rig.bodyPivot.position.set(0, 0, 0);
  rig.torso.position.set(0, 0.9, 0);
  rig.torso.rotation.set(0, 0, 0);
  rig.head.rotation.set(0, 0, 0);
  rig.leftLeg.rotation.set(0, 0, 0);
  rig.rightLeg.rotation.set(0, 0, 0);
  rig.skillAuraGroup.visible = false;
}
