'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { Users, Phone, Clock, BarChart } from 'lucide-react';
import { OutboundCallForm } from '@/components/outbound-call-form';

export default function DashboardPage() {
  const { userData } = useAuth();

  const summaryCards = [
    {
      title: 'Total Calls',
      value: '0',
      icon: Phone,
      description: 'No calls made yet',
    },
    {
      title: 'Active Agents',
      value: userData?.agents?.length || 0,
      icon: Users,
      description: 'Total agents configured',
    },
    {
      title: 'Minutes Used',
      value: '0',
      icon: Clock,
      description: 'No calls made yet',
    },
    {
      title: 'Avg. Call Duration',
      value: '0m 0s',
      icon: BarChart,
      description: 'No calls made yet',
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
         <Card>
            <CardHeader>
                <CardTitle>Make an Outbound Call</CardTitle>
            </CardHeader>
            <CardContent>
                <OutboundCallForm />
            </CardContent>
         </Card>
         <Card>
            <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground text-center mt-10">No recent activity.</p>
            </CardContent>
         </Card>
      </div>
    </div>
  );
}
