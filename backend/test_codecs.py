#!/usr/bin/env python3
"""
Test script to validate video codec availability on this system.
Run this to verify which codecs work before uploading videos.
"""

import cv2
from pathlib import Path

print("=" * 60)
print("Video Codec Availability Test")
print("=" * 60)

# List of codecs to test
codecs = ["avc1", "H264", "mp4v", "MJPEG"]

print(f"\nOpenCV Version: {cv2.__version__}")
print(f"Testing codecs on this system:\n")

for codec in codecs:
    try:
        fourcc = cv2.VideoWriter_fourcc(*codec)
        if fourcc == -1:
            print(f"  ✗ {codec:6s} - Not available")
        else:
            print(f"  ✓ {codec:6s} - Available (fourcc code: {fourcc})")
    except Exception as e:
        print(f"  ✗ {codec:6s} - Error: {str(e)[:40]}")

print("\n" + "=" * 60)
print("If all codecs show ✗, MJPEG will be used automatically.")
print("If at least one codec shows ✓, video output will work.")
print("=" * 60)
