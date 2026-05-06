'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';

type Color = 'red' | 'green' | 'blue' | 'yellow';

interface Player {
  id: number;
  name: string;
  color: Color;
}

interface Piece {
  id: string;
  playerId: number;
  color: Color;
  steps: number;
}
