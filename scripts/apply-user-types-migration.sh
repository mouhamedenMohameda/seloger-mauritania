#!/bin/bash

# Script pour appliquer la migration des types d'utilisateurs
# Cette migration ajoute le type 'agence' aux rôles disponibles

echo "🚀 Application de la migration des types d'utilisateurs..."
echo ""

# Vérifier si supabase CLI est installé
if ! command -v supabase &> /dev/null; then
    echo "⚠️  Supabase CLI n'est pas installé."
    echo ""
    echo "📋 Options pour appliquer la migration:"
    echo ""
    echo "1️⃣  Via Supabase Dashboard (Recommandé):"
    echo "   • Allez sur https://supabase.com/dashboard"
    echo "   • Sélectionnez votre projet"
    echo "   • Allez dans SQL Editor"
    echo "   • Copiez le contenu de: supabase/migrations/20240101000015_add_user_types.sql"
    echo "   • Collez-le et exécutez"
    echo ""
    echo "2️⃣  Installer Supabase CLI:"
    echo "   brew install supabase/tap/supabase"
    echo ""
    echo "3️⃣  Via psql (si vous avez une connexion directe):"
    echo "   psql -h [HOST] -U postgres -d postgres -f supabase/migrations/20240101000015_add_user_types.sql"
    echo ""
    exit 1
fi

# Appliquer la migration
echo "📝 Application de la migration 20240101000015_add_user_types.sql..."
supabase migration up --db-url "$DATABASE_URL" || supabase db push

echo ""
echo "✅ Migration appliquée avec succès!"
echo ""
echo "📋 Types d'utilisateurs disponibles:"
echo "   • 'user' - Utilisateur simple (par défaut)"
echo "   • 'admin' - Administrateur"
echo "   • 'agence' - Agence immobilière"
echo ""
