import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import type { Product, Category } from '../api';
import { Printer, Search, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const PriceTags: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [error, setError] = useState('');

    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        // Check if user is staff
        if (user && !user.is_staff) {
            navigate('/');
        }
    }, [user, navigate]);

    const fetchInitialData = useCallback(async () => {
        try {
            setLoading(true);
            const [productsRes, categoriesRes] = await Promise.all([
                api.get('/products', {
                    params: {
                        category_id: selectedCategory || undefined,
                        name__icontains: searchTerm || undefined, // Adjust if your API takes `search` param
                        limit: 50 // Note: API is paginated. You might want to remove pagination or load more if needed
                    }
                }),
                api.get('/categories')
            ]);
            // If your API returns paginated items as `items`, extract it
            setProducts(productsRes.data.items || productsRes.data);
            setCategories(categoriesRes.data);
        } catch (err) {
            console.error(err);
            setError('Erro ao carregar dados.');
        } finally {
            setLoading(false);
        }
    }, [selectedCategory, searchTerm, setProducts, setCategories, setLoading, setError]);

    useEffect(() => {
        fetchInitialData();
    }, [selectedCategory, fetchInitialData]);

    // Re-fetch when search term changes (with debounce in a real app)
    useEffect(() => {
        const handler = setTimeout(() => {
            fetchInitialData();
        }, 500);
        return () => clearTimeout(handler);
    }, [searchTerm, fetchInitialData]);

    const toggleSelection = (productId: number) => {
        const newSelection = new Set(selectedIds);
        if (newSelection.has(productId)) {
            newSelection.delete(productId);
        } else {
            newSelection.add(productId);
        }
        setSelectedIds(newSelection);
    };

    const toggleAll = () => {
        if (selectedIds.size === products.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(products.map(p => p.id)));
        }
    };

    const generateTags = async () => {
        if (selectedIds.size === 0) return;

        try {
            setGenerating(true);
            setError('');

            const response = await api.post('/tags/generate-pdf', {
                product_ids: Array.from(selectedIds)
            }, {
                responseType: 'blob' // Important for receiving binary data
            });

            // Create Object URL and trigger download/view
            const fileUrl = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            const fileLink = document.createElement('a');
            fileLink.href = fileUrl;
            fileLink.setAttribute('download', 'etiquetas_preco.pdf');
            document.body.appendChild(fileLink);
            fileLink.click();
            document.body.removeChild(fileLink);

        } catch (err) {
            console.error(err);
            setError('Falha ao gerar as etiquetas. Tente novamente.');
        } finally {
            setGenerating(false);
        }
    };

    if (!user?.is_staff) return null;

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gerar Etiquetas</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">
                        Selecione os produtos para gerar etiquetas PDF (53mm).
                    </p>
                </div>
                <button
                    onClick={generateTags}
                    disabled={selectedIds.size === 0 || generating}
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                    {generating ? <Loader2 className="animate-spin w-5 h-5" /> : <Printer className="w-5 h-5" />}
                    <span>Gerar {selectedIds.size} Etiquetas</span>
                </button>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">
                    {error}
                </div>
            )}

            <div className="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-gray-100 dark:border-dark-border overflow-hidden p-6 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nome..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-dark-border rounded-lg bg-gray-50 dark:bg-dark-bg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full md:w-64 px-4 py-2 border border-gray-200 dark:border-dark-border rounded-lg bg-gray-50 dark:bg-dark-bg"
                    >
                        <option value="">Todas as Categorias</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-gray-100 dark:border-dark-border overflow-hidden">
                {loading ? (
                    <div className="flex justify-center items-center p-12">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                ) : products.length === 0 ? (
                    <div className="text-center p-12 text-gray-500 dark:text-gray-400">
                        Nenhum produto encontrado.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 dark:bg-dark-bg border-b border-gray-200 dark:border-dark-border">
                                <tr>
                                    <th className="px-6 py-4">
                                        <input
                                            type="checkbox"
                                            checked={products.length > 0 && selectedIds.size === products.length}
                                            onChange={toggleAll}
                                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                                        />
                                    </th>
                                    <th className="px-6 py-4 font-medium text-gray-900 dark:text-gray-200">Produto</th>
                                    <th className="px-6 py-4 font-medium text-gray-900 dark:text-gray-200">Preço</th>
                                    <th className="px-6 py-4 font-medium text-gray-900 dark:text-gray-200">ID</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                                {products.map(product => (
                                    <tr
                                        key={product.id}
                                        className="hover:bg-gray-50 dark:hover:bg-dark-bg/50 cursor-pointer"
                                        onClick={() => toggleSelection(product.id)}
                                    >
                                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(product.id)}
                                                onChange={() => toggleSelection(product.id)}
                                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-3">
                                                {product.image && (
                                                    <img
                                                        src={product.image}
                                                        alt={product.name}
                                                        className="w-10 h-10 rounded object-cover"
                                                    />
                                                )}
                                                <span className="font-medium text-gray-900 dark:text-white">
                                                    {product.name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                                            R$ {Number(product.price).toFixed(2).replace('.', ',')}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                                            #{product.id}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PriceTags;
