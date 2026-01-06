import { useLeads } from '@/hooks/useLeads';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LEAD_STAGES } from '@/types/database';
import { Users, TrendingUp, Target, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function Dashboard() {
  const { currentWorkspace, currentRole } = useWorkspace();
  const { leads, loading } = useLeads();

  const stageData = LEAD_STAGES.map(stage => ({
    name: stage.label,
    value: leads.filter(l => l.stage === stage.value).length,
    color: stage.color.replace('bg-', ''),
  }));

  const stats = [
    { label: 'Total de Leads', value: leads.length, icon: Users, color: 'text-blue-500' },
    { label: 'Qualificados', value: leads.filter(l => l.stage === 'qualificado').length, icon: Target, color: 'text-green-500' },
    { label: 'Reuniões Agendadas', value: leads.filter(l => l.stage === 'reuniao_agendada').length, icon: Calendar, color: 'text-violet-500' },
    { label: 'Taxa de Conversão', value: leads.length > 0 ? `${Math.round((leads.filter(l => l.stage === 'qualificado' || l.stage === 'reuniao_agendada').length / leads.length) * 100)}%` : '0%', icon: TrendingUp, color: 'text-cyan-500' },
  ];

  const chartColors = ['#3b82f6', '#8b5cf6', '#eab308', '#06b6d4', '#ef4444', '#22c55e', '#a855f7'];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          {currentWorkspace?.name} • {currentRole === 'admin' ? 'Administrador' : 'SDR'}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leads por Etapa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageData} layout="vertical">
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {stageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={chartColors[index]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
