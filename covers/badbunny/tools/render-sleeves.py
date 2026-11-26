# covers/badbunny/tools/render-sleeves.py — Renders student-authored 1024x1024 sRGB album covers
# and artist portrait directly from our Blender 4.2 3D scenes (D8 compliance: 100% own artwork).
#
# Usage:
#   blender -b --factory-startup -P covers/badbunny/tools/render-sleeves.py

import math
import os
import bpy
import mathutils

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'public'))


def hex_to_rgb(hex_str):
    h = hex_str.lstrip('#')
    return tuple((int(h[i : i + 2], 16) / 255.0) ** 2.2 for i in (0, 2, 4))


def setup_render(res=1024, samples=48, file_format='PNG'):
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = samples
    scene.cycles.use_denoising = False
    scene.render.resolution_x = res
    scene.render.resolution_y = res
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = file_format
    if file_format == 'PNG':
        scene.render.image_settings.color_mode = 'RGB'
        scene.render.image_settings.color_depth = '8'
    else:
        scene.render.image_settings.color_mode = 'RGB'
        scene.render.image_settings.quality = 94
    scene.view_settings.view_transform = 'Standard'
    scene.view_settings.look = 'None'


def set_world_color(hex_str, strength=1.0):
    world = bpy.data.worlds.new('CoverWorld')
    bpy.context.scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get('Background')
    if bg:
        r, g, b = hex_to_rgb(hex_str)
        bg.inputs[0].default_value = (r, g, b, 1.0)
        bg.inputs[1].default_value = strength


def add_camera(pos_three, target_three, fov_deg=50.0):
    # Convert Three.js (x, y, z) -> Blender (x, -z, y)
    pos = mathutils.Vector((pos_three[0], -pos_three[2], pos_three[1]))
    target = mathutils.Vector((target_three[0], -target_three[2], target_three[1]))

    cam_data = bpy.data.cameras.new('CoverCam')
    cam_data.lens_unit = 'FOV'
    cam_data.angle = math.radians(fov_deg)
    cam_obj = bpy.data.objects.new('CoverCam', cam_data)
    bpy.context.collection.objects.link(cam_obj)
    cam_obj.location = pos

    direction = target - pos
    rot_quat = direction.to_track_quat('-Z', 'Y')
    cam_obj.rotation_euler = rot_quat.to_euler()
    bpy.context.scene.camera = cam_obj
    return cam_obj


def add_point_light(name, pos_three, hex_str, energy=300.0, radius=0.4):
    pos = (pos_three[0], -pos_three[2], pos_three[1])
    light_data = bpy.data.lights.new(name=name, type='POINT')
    light_data.color = hex_to_rgb(hex_str)
    light_data.energy = energy
    light_data.shadow_soft_size = radius
    light_obj = bpy.data.objects.new(name=name, object_data=light_data)
    bpy.context.collection.objects.link(light_obj)
    light_obj.location = pos
    return light_obj


def add_sun_light(name, dir_three, hex_str, energy=3.5):
    pos = mathutils.Vector((dir_three[0], -dir_three[2], dir_three[1]))
    light_data = bpy.data.lights.new(name=name, type='SUN')
    light_data.color = hex_to_rgb(hex_str)
    light_data.energy = energy
    light_obj = bpy.data.objects.new(name=name, object_data=light_data)
    bpy.context.collection.objects.link(light_obj)
    rot_quat = (-pos).to_track_quat('-Z', 'Y')
    light_obj.rotation_euler = rot_quat.to_euler()
    return light_obj


def add_emissive_mesh(name, mesh_type, pos_three, scale_three, hex_str, strength=1.5):
    pos = (pos_three[0], -pos_three[2], pos_three[1])
    if mesh_type == 'SPHERE':
        bpy.ops.mesh.primitive_uv_sphere_add(radius=1.0, location=pos, segments=24, ring_count=16)
    elif mesh_type == 'PLANE':
        bpy.ops.mesh.primitive_plane_add(size=1.0, location=pos, rotation=(math.pi / 2, 0, 0))
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (scale_three[0], scale_three[2], scale_three[1])

    mat = bpy.data.materials.new(name=f'{name}_Mat')
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()
    out = nodes.new('ShaderNodeOutputMaterial')
    em = nodes.new('ShaderNodeEmission')
    r, g, b = hex_to_rgb(hex_str)
    em.inputs['Color'].default_value = (r, g, b, 1.0)
    em.inputs['Strength'].default_value = strength
    links.new(em.outputs['Emission'], out.inputs['Surface'])
    obj.data.materials.append(mat)
    return obj


def render_yhlqmdlg():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'yhlqmdlg-world.glb'))

    # Hide turntable & studio meshes behind the overview camera
    for obj in list(bpy.data.objects):
        if any(k in obj.name for k in ('Turntable', 'Studio')):
            bpy.data.objects.remove(obj, do_unlink=True)

    set_world_color('#071e3d', strength=1.2)
    add_emissive_mesh('StormBackdrop', 'PLANE', (0, 3.6, -11.5), (28, 13, 1), '#0d4b8c', strength=1.2)
    add_emissive_mesh('StormCore', 'SPHERE', (0, 3.2, -9.8), (5.2, 5.2, 0.3), '#248ce0', strength=1.6)
    cloud_puffs = [
        ((-4.5, 5.2, -7.5), (4.2, 1.8, 2.2), '#0c3b6e'),
        ((-0.8, 5.8, -8.2), (5.0, 2.2, 2.4), '#13569e'),
        ((3.6, 5.0, -7.8), (4.5, 1.9, 2.2), '#0e4888'),
        ((0.5, 3.8, -9.0), (6.2, 2.1, 2.0), '#1b72c4'),
    ]
    for i, (p, s, c) in enumerate(cloud_puffs):
        add_emissive_mesh(f'Cloud_{i}', 'SPHERE', p, s, c, strength=0.9)

    add_sun_light('KeySun', (4.5, 8.5, 4.0), '#fff7e6', energy=3.5)
    add_sun_light('RimSun', (-5.0, 5.0, -4.0), '#00f0ff', energy=2.2)
    add_point_light('FireLight', (-3.85, 1.35, -1.65), '#ff5500', energy=450.0)
    add_point_light('SparkLight', (-4.45, 4.35, -2.85), '#45caff', energy=450.0)
    add_point_light('BoyKey', (0.2, 2.4, 3.5), '#ffd8be', energy=320.0)

    add_camera((0.0, 2.55, 6.4), (0.0, 1.65, -1.2), fov_deg=50.0)
    setup_render(1024, samples=48, file_format='PNG')
    bpy.context.scene.render.filepath = os.path.join(ROOT, 'sleeve.png')
    bpy.ops.render.render(write_still=True)


def render_dtmf():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'dtmf-world.glb'))

    # Import Sapo Concho between the two white chairs
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'sapo_concho.glb'))
    after = set(bpy.data.objects) - before

    parent = bpy.data.objects.new('SapoRoot', None)
    bpy.context.collection.objects.link(parent)
    parent.location = (-0.02, -1.55, 0.68)
    parent.scale = (0.72, 0.72, 0.72)
    for obj in after:
        if obj.parent is None:
            obj.parent = parent

    set_world_color('#153e1c', strength=1.5)
    add_sun_light('KeySun', (4.5, 8.5, 4.0), '#fff7e6', energy=4.2)
    add_sun_light('FillSun', (-5.0, 5.0, 2.0), '#86efac', energy=2.0)
    add_point_light('PatioKey', (0.5, 3.8, 3.5), '#fffbeb', energy=420.0)
    add_point_light('CanopyFill', (-1.5, 2.2, 3.2), '#dcfce7', energy=260.0)
    add_point_light('Bounce', (0.0, 2.6, 0.5), '#bef264', energy=240.0)

    add_camera((0.0, 2.55, 6.4), (0.0, 1.65, -1.2), fov_deg=50.0)
    setup_render(1024, samples=48, file_format='PNG')
    bpy.context.scene.render.filepath = os.path.join(ROOT, 'dtmf.png')
    bpy.ops.render.render(write_still=True)


def render_uvst():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'uvst-world.glb'))

    set_world_color('#e8526b', strength=1.4)
    add_sun_light('KeySun', (4.5, 8.5, 4.0), '#fff7e6', energy=3.8)
    add_sun_light('FillSun', (-5.0, 5.0, 3.0), '#ff8a65', energy=2.2)
    add_point_light('BeachFront', (0.0, 3.2, 4.0), '#fff7ed', energy=380.0)
    add_point_light('SunGlow', (1.5, 3.5, -2.5), '#fde047', energy=420.0)

    add_camera((0.0, 2.55, 6.4), (0.0, 1.65, -1.2), fov_deg=50.0)
    setup_render(1024, samples=48, file_format='JPEG')
    bpy.context.scene.render.filepath = os.path.join(ROOT, 'uvst.jpg')
    bpy.ops.render.render(write_still=True)


def render_eutdm():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'eutdm-world.glb'))

    set_world_color('#1a0605', strength=1.3)
    add_sun_light('KeySun', (4.5, 8.5, 4.0), '#fff7e6', energy=3.6)
    add_sun_light('CrimsonFill', (-5.0, 5.0, 2.0), '#f97316', energy=2.4)
    add_point_light('FrontKey', (0.0, 2.2, 4.2), '#ffd8be', energy=460.0)
    add_point_light('GrilleGlow', (0.0, 0.9, 2.65), '#ff8c1a', energy=360.0)
    add_point_light('CrimsonRim', (0.0, 3.8, -4.5), '#ff2a00', energy=650.0)

    add_camera((0.0, 2.55, 6.4), (0.0, 1.65, -1.2), fov_deg=50.0)
    setup_render(1024, samples=48, file_format='JPEG')
    bpy.context.scene.render.filepath = os.path.join(ROOT, 'eutdm.jpg')
    bpy.ops.render.render(write_still=True)


def render_badbunny_portrait():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'eutdm-world.glb'))

    set_world_color('#14071e', strength=1.3)
    add_emissive_mesh('PortraitBackdrop', 'PLANE', (0.0, 3.85, -0.35), (2.5, 2.5, 1.0), '#2b0938', strength=1.4)
    add_point_light('PortraitKey', (0.45, 4.15, 1.85), '#fff1e6', energy=140.0, radius=0.35)
    add_point_light('NeonCyanRim', (-0.75, 4.05, 0.85), '#00f0ff', energy=110.0, radius=0.3)
    add_point_light('NeonPinkRim', (0.75, 3.85, 0.75), '#ff2a85', energy=120.0, radius=0.3)

    # Close-up portrait framing of EutdmBadBunny (head & upper torso at Y_three ~ 3.6..4.35, Z_three ~ 0.6)
    add_camera((0.0, 3.98, 1.78), (0.0, 3.90, 0.60), fov_deg=38.0)
    setup_render(1024, samples=48, file_format='JPEG')
    bpy.context.scene.render.filepath = os.path.join(ROOT, 'badbunny.jpeg')
    bpy.ops.render.render(write_still=True)


if __name__ == '__main__':
    render_yhlqmdlg()
    render_dtmf()
    render_uvst()
    render_eutdm()
    render_badbunny_portrait()
    print('ALL 5 BLENDER RENDERS COMPLETED!')
