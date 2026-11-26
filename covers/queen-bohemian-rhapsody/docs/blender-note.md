# Blender — fuente del GLB (Fase 3)

Los ficheros de autoría **no se commitean** (`.cursor/rules/40-asset-pipeline`: nada de fuentes de autoría) y
`blender/.gitignore` los excluye. En la máquina de gontugithub quedan:

| Fichero | Qué es |
| --- | --- |
| `blender/stadium.blend` (42,8 MB) | Escena completa. La colección `REF_Sketchfab_Freddie` guarda el modelo original con rig, ya posado, para volver a generar `Freddie`. `Freddie_maniqui` (fila 19) queda oculto. |
| `blender/stadium.glb` (6,4 MB) | Export sin comprimir: entrada de `gltf-transform optimize` en task3. |
| `blender/textures/freddie_atlas.png` | Atlas de Freddie, 2048², RGBA (alfa solo en pelo y bigote). |
| `blender/textures/stadium_ao.png` | AO de `Stadium` + `Stage`, 2048², UV `atlas`, guardado en sRGB (va en `baseColorTexture`). |

## Contenido del GLB

Nodos `Fan_LOD0`, `Fan_LOD1`, `Freddie`, `Mic`, `Stadium` y `Stage`. +Y arriba, sin cámaras ni luces.
43 921 tris, 8 primitivas, 6 materiales y 2 imágenes (Fan_LOD1 rehecho a 70 tris en task3).

- `Freddie`: 23 683 tris, 1 material con atlas y `alphaMode: MASK`, una sola cara.
- `Stadium` + `Stage`: material compartido `QBR_Baked` = `COLOR_0` × AO. `Sg_Lamp` es emisivo aparte.
- `Mic`: 2 materiales de color liso. Los fans: material `Fan`, de color liso.
- Los nodos `Fan_LOD*` llevan una traslación de ±0,6 m: `Crowd.jsx` usa solo su geometría.

## Regenerar el GLB

Blender 5.2.3, abrir `blender/stadium.blend`. Activar temporalmente la colección `QBR_Fans`
(está desactivada en el viewport y el exportador ignora lo desactivado). Seleccionar solo los seis nodos y exportar:

```python
bpy.ops.export_scene.gltf(filepath="…/blender/stadium.glb", export_format='GLB', use_selection=True,
    export_yup=True, export_apply=True, export_cameras=False, export_lights=False,
    export_animations=False, export_skins=False, export_morph=False,
    export_vertex_color='MATERIAL', export_materials='EXPORT', export_image_format='AUTO',
    export_draco_mesh_compression_enable=False, export_meshopt_compression_enable=False)
```

La compresión (meshopt + KTX2) se hace después, en task3, con `gltf-transform`.

## Atribución (CC-BY-4.0)

`Freddie` se deriva de «Freddie Mercury - T_Pose» de **Gerwerni**
(https://sketchfab.com/3d-models/freddie-mercury-t-pose-b89ee72767a54daa8c79768a5cdd2bbd),
licencia CC-BY-4.0. Cambios: pose, diezmado y bake a un atlas. La atribución debe verse en la cover (task3).
Decisión y riesgos de parecido: fila 20 de `ai-3d-merge-log.md`.
