#!/usr/bin/env python3
import re
import json
import sys

# Fix console encoding for Windows
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Read the file
with open('src/lib/tutorial/config.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Define blockName mappings for each step that doesn't have one
# Format: (id_pattern, blockName_value)
block_names = {
    'card-1': 'Movimientos de Tarjetas',
    'card-2': 'Registrar Transacción',
    'card-3': 'Gestión de Tarjetas',
    'card-4': 'Resumen y Reportes',
    'retention-1': 'Retenciones Fiscales',
    'retention-2': 'Registrar Retención',
    'retention-3': 'Clasificación por Tipo',
    'retention-4': 'Resumen para Contador',
    'tech-1': 'Servicios Técnicos',
    'tech-2': 'Crear Trabajo',
    'tech-3': 'Estados del Servicio',
    'tech-4': 'Generar Factura',
    'cash-1': 'Control de Caja',
    'cash-2': 'Apertura de Caja',
    'cash-3': 'Movimientos Diarios',
    'cash-4': 'Cierre de Caja',
    'expenses-1': 'Registro de Gastos',
    'expenses-2': 'Registrar Gasto',
    'expenses-3': 'Categorías de Gasto',
    'expenses-4': 'Análisis de Gastos',
    'checks-1': 'Gestión de Cheques',
    'checks-2': 'Cheques Emitidos',
    'checks-3': 'Cheques Recibidos',
    'checks-4': 'Estado del Cheque',
    'promos-1': 'Promociones y Descuentos',
    'promos-2': 'Crear Promoción',
    'promos-3': 'Reglas de la Promoción',
    'promos-4': 'Desempeño de Promoción',
    'payroll-1': 'Sistema de Liquidaciones',
    'payroll-2': 'Crear Liquidación',
    'payroll-3': 'Componentes de Nómina',
    'payroll-4': 'Generación de Documentos',
    'comm-1': 'Sistema de Comisiones',
    'comm-2': 'Configurar Reglas',
    'comm-3': 'Ventas y Comisión',
    'comm-4': 'Validación de Comisiones',
    'emp-1': 'Base de Datos de Empleados',
    'emp-2': 'Agregar Empleado',
    'emp-3': 'Documentación de Empleado',
    'emp-4': 'Desactivación de Empleado',
    'reports-1': 'Suite de Reportes',
    'reports-2': 'Reporte de Ventas',
    'reports-3': 'Reporte de Inventario',
    'reports-4': 'Análisis de Márgenes',
    'reports-5': 'Exportación de Reportes',
    'acct-1': 'Reportes Contables',
    'acct-2': 'Estado de Resultados',
    'acct-3': 'Libro Mayor',
    'acct-4': 'Obligaciones Fiscales',
    'email-1': 'Configuración de Email',
    'email-2': 'Servidor SMTP',
    'email-3': 'Dirección de Envío',
    'email-4': 'Envío de Prueba',
    'posafip-1': 'Puntos de Venta AFIP',
    'posafip-2': 'Registrar PdV',
    'posafip-3': 'Tipos de Comprobantes',
    'posafip-4': 'Próximo Comprobante',
    'audit-1': 'Logs de Auditoría',
    'audit-2': 'Filtrar Logs',
    'audit-3': 'Detalle del Log',
    'audit-4': 'Exportar Auditoría',
    'access-1': 'Logs de Acceso',
    'access-2': 'Historial de Login',
    'access-3': 'Intentos Fallidos',
    'access-4': 'Alertas de Seguridad',
    'invalerts-1': 'Alertas de Inventario',
    'invalerts-2': 'Stock Bajo',
    'invalerts-3': 'Stock Crítico',
    'invalerts-4': 'Crear PO',
    'whse-1': 'Gestión de Almacenes',
    'whse-2': 'Crear Almacén',
    'whse-3': 'Stock por Almacén',
    'whse-4': 'Responsable de Almacén',
    'whstock-1': 'Consulta de Stock',
    'whstock-2': 'Seleccionar Depósito',
    'whstock-3': 'Stock Disponible',
    'whstock-4': 'Transferir Stock',
    'transfer-1': 'Transferencias de Stock',
    'transfer-2': 'Crear Transferencia',
    'transfer-3': 'Seleccionar Productos',
    'transfer-4': 'Confirmar Transferencia',
    'sres-1': 'Reservas de Stock',
    'sres-2': 'Items Reservados',
    'sres-3': 'Liberar Reserva',
    'sres-4': 'Confirmar Venta',
    'close-1': 'Cierre Mensual',
    'close-2': 'Verificar Datos',
    'close-3': 'Checklist de Cierre',
    'close-4': 'Generar Reportes',
    'close-5': 'Bloquear Período',
    'bulk-1': 'Operaciones Masivas',
    'bulk-2': 'Actualizar Precios',
    'bulk-3': 'Actualizar Stock',
    'bulk-4': 'Previsualizar Cambios',
    'notif-1': 'Configuración de Notificaciones',
    'notif-2': 'Tipos de Notificación',
    'notif-3': 'Canales de Entrega',
    'notif-4': 'Frecuencia',
    'integ-1': 'Integraciones',
    'integ-2': 'Integraciones Disponibles',
    'integ-3': 'Conectar Integración',
    'integ-4': 'Sincronización',
    'afip-1': 'Facturación AFIP',
    'afip-2': 'Estado de Facturación',
    'afip-3': 'Tipos de Comprobantes',
    'afip-4': 'Numeración',
    'settings-1': 'Configuración General',
    'settings-2': 'Datos de la Empresa',
    'settings-3': 'Métodos de Pago',
    'migration-1': 'Bienvenida a Migración',
    'migration-2': 'Exportar Datos',
    'migration-3': 'Datos de Empresa',
    'migration-4': 'Métodos de Pago',
    'migration-5': 'Importar Clientes',
    'migration-6': 'Importar Productos',
    'migration-7': 'Importar Proveedores/Empleados',
    'migration-8': 'Cerrar Saldos',
    'migration-9': 'Validación Final',
    'migration-10': 'Próximos Pasos',
    'learning-1': 'Centro de Aprendizaje',
    'learning-2': 'Tutoriales Organizados',
    'learning-3': 'Cómo Ejecutar Tutorial',
    'learning-4': 'Tiempo de Tutoriales',
    'learning-5': 'Compartir Tutoriales',
    'kb-1': 'Base de Conocimiento',
    'kb-2': 'Buscar por Palabra Clave',
    'kb-3': 'Navegar Categorías',
    'kb-4': 'Artículos Recomendados',
    'support-1': 'Centro de Soporte',
    'support-2': 'Chat en Vivo',
    'support-3': 'Email y Tickets',
}

# Also add for supplier steps that are missing
suppliers_blocknames = {
    'suppliers-1': 'Base de Proveedores',
    'suppliers-2': 'Agregar Proveedor',
    'suppliers-3': 'Condiciones Comerciales',
    'suppliers-4': 'Calificación del Proveedor',
    'bank-1': 'Cuentas Bancarias',
    'bank-2': 'Agregar Cuenta',
    'bank-3': 'Saldo en Tiempo Real',
    'bank-4': 'Vinculación de Movimientos',
}

block_names.update(suppliers_blocknames)

# Pattern to match steps without blockName
# Looks for: {\n        id: 'xxx-y',\n        title: 
# and needs to add blockName after the id line
# But some have target: '[data-tutorial=...]' after id

count = 0
for id_val, block_name in block_names.items():
    # Pattern 1: Simple case - id directly followed by title
    pattern1 = rf"({{[\n\s]+id:\s*'{id_val}',[\n\s]+)(title:)"
    replacement1 = rf"\1blockName: '{block_name}',\n        \2"
    
    # Pattern 2: With target in between
    pattern2 = rf"({{[\n\s]+id:\s*'{id_val}',[\n\s]+target:\s*'[^']*',[\n\s]+)(title:)"
    replacement2 = rf"\1blockName: '{block_name}',\n        \2"
    
    # Try pattern 1 first
    new_content, num_subs = re.subn(pattern1, replacement1, content)
    if num_subs > 0:
        content = new_content
        count += num_subs
        print(f"✓ Added blockName to '{id_val}': {block_name} (pattern 1, {num_subs} occurrence)")
    else:
        # Try pattern 2
        new_content, num_subs = re.subn(pattern2, replacement2, content)
        if num_subs > 0:
            content = new_content
            count += num_subs
            print(f"✓ Added blockName to '{id_val}': {block_name} (pattern 2, {num_subs} occurrence)")
        else:
            print(f"✗ Could not find pattern for '{id_val}'")

print(f"\nTotal replacements made: {count}")

# Write the updated content
with open('src/lib/tutorial/config.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("File updated successfully!")
