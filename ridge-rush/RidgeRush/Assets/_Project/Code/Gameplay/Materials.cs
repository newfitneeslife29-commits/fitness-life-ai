using System.Collections.Generic;
using RidgeRush.Simulation;
using UnityEngine;

namespace RidgeRush.Game
{
    /// <summary>
    /// Materiales base creados por el menú "Ridge Rush → Configurar proyecto". Se referencian desde la escena
    /// para que Unity incluya sus shaders en la compilación (Shader.Find no funciona en builds si nadie los usa).
    /// </summary>
    [CreateAssetMenu(menuName = "Ridge Rush/Material Library")]
    public sealed class MaterialLibrary : ScriptableObject
    {
        [Tooltip("Universal Render Pipeline/Lit")] public Material lit;
        [Tooltip("Universal Render Pipeline/Particles/Unlit, transparente")] public Material particles;
        [Tooltip("Skybox/Procedural")] public Material skybox;
    }

    /// <summary>
    /// Crea y reutiliza materiales PBR en tiempo de ejecución a partir de la biblioteca.
    /// En la fase de producción se sustituyen por materiales de arte con texturas (ver docs/04-lista-assets.md).
    /// </summary>
    public static class MaterialFactory
    {
        private static MaterialLibrary _lib;
        private static readonly Dictionary<string, Material> Cache = new Dictionary<string, Material>();

        public static void Init(MaterialLibrary lib)
        {
            _lib = lib;
            Cache.Clear();
        }

        public static MaterialLibrary Library => _lib;

        /// <summary>Material PBR. metallic/smoothness como en URP Lit.</summary>
        public static Material Lit(string key, Color color, float metallic = 0f, float smoothness = 0.4f,
                                   Texture2D albedo = null, Texture2D normal = null, Vector2? tiling = null, Color? emission = null,
                                   Texture2D emissionMap = null)
        {
            if (Cache.TryGetValue(key, out var m)) return m;
            m = new Material(_lib.lit) { name = key };
            m.SetColor("_BaseColor", color);
            m.SetFloat("_Metallic", metallic);
            m.SetFloat("_Smoothness", smoothness);
            if (albedo != null)
            {
                m.SetTexture("_BaseMap", albedo);
                m.SetTextureScale("_BaseMap", tiling ?? Vector2.one);
            }
            if (normal != null)
            {
                m.SetTexture("_BumpMap", normal);
                m.SetTextureScale("_BumpMap", tiling ?? Vector2.one);
                m.EnableKeyword("_NORMALMAP");
            }
            if (emission.HasValue)
            {
                m.EnableKeyword("_EMISSION");
                m.SetColor("_EmissionColor", emission.Value);
                if (emissionMap != null)
                {
                    m.SetTexture("_EmissionMap", emissionMap);
                    m.SetTextureScale("_EmissionMap", tiling ?? Vector2.one);
                }
                m.globalIlluminationFlags = MaterialGlobalIlluminationFlags.RealtimeEmissive;
            }
            Cache[key] = m;
            return m;
        }

        /// <summary>Material de partículas transparente con una textura dada.</summary>
        public static Material Particles(string key, Texture2D tex, Color tint)
        {
            if (Cache.TryGetValue(key, out var m)) return m;
            m = new Material(_lib.particles) { name = key };
            m.SetTexture("_BaseMap", tex);
            m.SetColor("_BaseColor", tint);
            Cache[key] = m;
            return m;
        }

        /// <summary>Material del suelo según la superficie (con textura de ruido y relieve procedurales).</summary>
        public static Material Surface(SurfaceType s)
        {
            switch (s)
            {
                case SurfaceType.Sand: return Lit("surf_sand", new Color(0.93f, 0.82f, 0.62f), 0f, 0.15f, ProceduralTextures.Grain, ProceduralTextures.GrainNormal, new Vector2(2f, 2f));
                case SurfaceType.Mud: return Lit("surf_mud", new Color(0.33f, 0.24f, 0.17f), 0f, 0.62f, ProceduralTextures.Grain, ProceduralTextures.GrainNormal, new Vector2(1.5f, 1.5f));
                case SurfaceType.Snow: return Lit("surf_snow", new Color(0.95f, 0.97f, 1f), 0f, 0.35f, ProceduralTextures.Grain, ProceduralTextures.GrainNormal, Vector2.one);
                case SurfaceType.Ice: return Lit("surf_ice", new Color(0.78f, 0.9f, 1f), 0f, 0.92f);
                case SurfaceType.Asphalt: return Lit("surf_asphalt", new Color(0.2f, 0.2f, 0.21f), 0f, 0.3f, ProceduralTextures.Grain, ProceduralTextures.GrainNormal, new Vector2(3f, 3f));
                case SurfaceType.Metal: return Lit("surf_metal", new Color(0.55f, 0.57f, 0.6f), 0.9f, 0.55f, ProceduralTextures.Planks, ProceduralTextures.PlanksNormal, new Vector2(1f, 2f));
                case SurfaceType.Wood: return Lit("surf_wood", new Color(0.62f, 0.45f, 0.3f), 0f, 0.35f, ProceduralTextures.Planks, ProceduralTextures.PlanksNormal, new Vector2(1f, 1f));
                case SurfaceType.Water: return Lit("surf_water", new Color(0.05f, 0.35f, 0.42f), 0f, 0.95f);
                default: return Lit("surf_dirt", new Color(0.55f, 0.4f, 0.27f), 0f, 0.2f, ProceduralTextures.Grain, ProceduralTextures.GrainNormal, new Vector2(2f, 2f));
            }
        }
    }
}
