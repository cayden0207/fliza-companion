/**
 * Mixamo to VRM Bone Mapping
 * Maps Mixamo rig bone names to VRM humanoid bone names
 * Used for converting FBX animations to work with VRM models
 */
export const mixamoVRMRigMap: Record<string, string> = {
    // Spine
    'mixamorigHips': 'hips',
    'mixamorigSpine': 'spine',
    'mixamorigSpine1': 'chest',
    'mixamorigSpine2': 'upperChest',
    'mixamorigNeck': 'neck',
    'mixamorigHead': 'head',

    // Left Arm
    'mixamorigLeftShoulder': 'leftShoulder',
    'mixamorigLeftArm': 'leftUpperArm',
    'mixamorigLeftForeArm': 'leftLowerArm',
    'mixamorigLeftHand': 'leftHand',

    // Left Hand Fingers
    'mixamorigLeftHandThumb1': 'leftThumbProximal',
    'mixamorigLeftHandThumb2': 'leftThumbIntermediate',
    'mixamorigLeftHandThumb3': 'leftThumbDistal',
    'mixamorigLeftHandIndex1': 'leftIndexProximal',
    'mixamorigLeftHandIndex2': 'leftIndexIntermediate',
    'mixamorigLeftHandIndex3': 'leftIndexDistal',
    'mixamorigLeftHandMiddle1': 'leftMiddleProximal',
    'mixamorigLeftHandMiddle2': 'leftMiddleIntermediate',
    'mixamorigLeftHandMiddle3': 'leftMiddleDistal',
    'mixamorigLeftHandRing1': 'leftRingProximal',
    'mixamorigLeftHandRing2': 'leftRingIntermediate',
    'mixamorigLeftHandRing3': 'leftRingDistal',
    'mixamorigLeftHandPinky1': 'leftLittleProximal',
    'mixamorigLeftHandPinky2': 'leftLittleIntermediate',
    'mixamorigLeftHandPinky3': 'leftLittleDistal',

    // Right Arm
    'mixamorigRightShoulder': 'rightShoulder',
    'mixamorigRightArm': 'rightUpperArm',
    'mixamorigRightForeArm': 'rightLowerArm',
    'mixamorigRightHand': 'rightHand',

    // Right Hand Fingers
    'mixamorigRightHandThumb1': 'rightThumbProximal',
    'mixamorigRightHandThumb2': 'rightThumbIntermediate',
    'mixamorigRightHandThumb3': 'rightThumbDistal',
    'mixamorigRightHandIndex1': 'rightIndexProximal',
    'mixamorigRightHandIndex2': 'rightIndexIntermediate',
    'mixamorigRightHandIndex3': 'rightIndexDistal',
    'mixamorigRightHandMiddle1': 'rightMiddleProximal',
    'mixamorigRightHandMiddle2': 'rightMiddleIntermediate',
    'mixamorigRightHandMiddle3': 'rightMiddleDistal',
    'mixamorigRightHandRing1': 'rightRingProximal',
    'mixamorigRightHandRing2': 'rightRingIntermediate',
    'mixamorigRightHandRing3': 'rightRingDistal',
    'mixamorigRightHandPinky1': 'rightLittleProximal',
    'mixamorigRightHandPinky2': 'rightLittleIntermediate',
    'mixamorigRightHandPinky3': 'rightLittleDistal',

    // Left Leg
    'mixamorigLeftUpLeg': 'leftUpperLeg',
    'mixamorigLeftLeg': 'leftLowerLeg',
    'mixamorigLeftFoot': 'leftFoot',
    'mixamorigLeftToeBase': 'leftToes',

    // Right Leg
    'mixamorigRightUpLeg': 'rightUpperLeg',
    'mixamorigRightLeg': 'rightLowerLeg',
    'mixamorigRightFoot': 'rightFoot',
    'mixamorigRightToeBase': 'rightToes',
};
